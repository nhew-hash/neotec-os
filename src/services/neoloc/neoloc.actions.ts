"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types";
import type { TipoComandoNeoLoc } from "@/types/neoloc";
import { gerarCommandId } from "./motor";

async function registrarEvento(dispositivoId: string, tipo: string, usuarioId: string | null, motivo?: string, comandoId?: string, resultado?: string) {
  const supabase = await createClient();
  await supabase.from("neoloc_eventos").insert({ dispositivo_id: dispositivoId, comando_id: comandoId ?? null, tipo, usuario_id: usuarioId, motivo: motivo ?? null, resultado: resultado ?? null });
}

export interface CadastrarDispositivoInput {
  aparelhoId: string;
  contratoId: string | null;
  clienteId: string | null;
  udid?: string;
  imei2?: string;
  observacoes?: string;
}

export async function cadastrarDispositivoAction(input: CadastrarDispositivoInput): Promise<ActionResult<{ dispositivoId: string }>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Sessão expirada" };

    const { data: perfil } = await supabase.from("usuarios").select("loja_id").eq("id", user.id).single();
    if (!perfil) return { success: false, error: "Perfil não encontrado" };

    const { data: existente } = await supabase.from("neoloc_dispositivos").select("id").eq("aparelho_id", input.aparelhoId).maybeSingle();
    if (existente) return { success: false, error: "Este aparelho já tem um dispositivo NeoLoc cadastrado." };

    const { data: dispositivo, error } = await supabase
      .from("neoloc_dispositivos")
      .insert({
        loja_id: perfil.loja_id,
        aparelho_id: input.aparelhoId,
        contrato_id: input.contratoId,
        cliente_id: input.clienteId,
        udid: input.udid ?? null,
        imei2: input.imei2 ?? null,
        observacoes: input.observacoes ?? null,
        status_mdm: "nao_matriculado",
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error || !dispositivo) return { success: false, error: error?.message ?? "Falha ao cadastrar dispositivo." };

    await registrarEvento(dispositivo.id, "dispositivo_cadastrado", user.id);
    revalidatePath("/neoloc");
    revalidatePath("/neoloc/dispositivos");
    return { success: true, data: { dispositivoId: dispositivo.id } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erro inesperado ao cadastrar dispositivo." };
  }
}

/**
 * Registra a intenção de matrícula (enrollment). Milestone 2: só marca o
 * dispositivo como `pendente_matricula` e cria o registro de enrollment —
 * não fala com nenhum servidor MDM real ainda (isso depende do
 * Milestone 1, validado fisicamente, que não está disponível neste
 * ambiente). Quando a integração real existir, esta função passa a
 * também disparar o enrollment de verdade contra o NeoLoc MDM Service.
 */
export async function iniciarEnrollmentAction(dispositivoId: string, metodo: "automated_device_enrollment" | "apple_configurator" | "manual"): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Sessão expirada" };

    await supabase.from("neoloc_enrollments").insert({ dispositivo_id: dispositivoId, metodo, status: "pendente", usuario_id: user.id });
    await supabase.from("neoloc_dispositivos").update({ status_mdm: "pendente_matricula" }).eq("id", dispositivoId);
    await registrarEvento(dispositivoId, "enrollment_iniciado", user.id, `Método: ${metodo}`);

    revalidatePath(`/neoloc/dispositivos/${dispositivoId}`);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erro inesperado ao iniciar enrollment." };
  }
}

/**
 * Gera um comando na fila (`neoloc_comandos`), sempre com `command_id`
 * idempotente. Nunca é executado direto do frontend contra um MDM real —
 * isso é responsabilidade de um worker separado (fila → NeoLoc MDM
 * Service → NanoMDM), que ainda não existe porque depende do
 * Milestone 1. Por isso todo comando criado aqui fica com status
 * `pending` e é isso mesmo: registrar a intenção com auditoria completa,
 * pronta pra ser consumida assim que a integração real existir.
 *
 * Ações destrutivas (`apagar`) exigem confirmação explícita do chamador
 * (`confirmacaoForte: true`) — item 19/25 do prompt do NeoLoc.
 */
export async function criarComandoAction(input: { dispositivoId: string; tipo: TipoComandoNeoLoc; motivo?: string; confirmacaoForte?: boolean }): Promise<ActionResult<{ comandoId: string }>> {
  try {
    if (input.tipo === "apagar" && !input.confirmacaoForte) {
      return { success: false, error: "Apagar o dispositivo é uma ação destrutiva e exige confirmação explícita." };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Sessão expirada" };

    const { data: dispositivo } = await supabase.from("neoloc_dispositivos").select("id, status_mdm, contrato_id").eq("id", input.dispositivoId).maybeSingle();
    if (!dispositivo) return { success: false, error: "Dispositivo não encontrado." };
    if (dispositivo.status_mdm !== "matriculado") {
      return { success: false, error: "Este dispositivo ainda não está matriculado no MDM — não é possível enviar comandos." };
    }

    const commandId = gerarCommandId(input.dispositivoId, input.tipo);
    const { data: comando, error } = await supabase
      .from("neoloc_comandos")
      .insert({
        command_id: commandId,
        dispositivo_id: input.dispositivoId,
        tipo: input.tipo,
        origem: "manual",
        usuario_id: user.id,
        motivo: input.motivo ?? null,
        contrato_id: dispositivo.contrato_id,
        status: "pending",
      })
      .select("id")
      .single();

    // command_id repetido no mesmo dia pro mesmo tipo/dispositivo = já existe um comando igual em andamento — não é erro, é a idempotência funcionando.
    if (error?.code === "23505") return { success: false, error: "Já existe um comando igual em andamento para este dispositivo hoje." };
    if (error || !comando) return { success: false, error: error?.message ?? "Falha ao criar comando." };

    await registrarEvento(input.dispositivoId, `comando_${input.tipo}`, user.id, input.motivo, comando.id, "PENDING — aguardando integração com o MDM (Milestone 1/3)");

    revalidatePath(`/neoloc/dispositivos/${input.dispositivoId}`);
    return { success: true, data: { comandoId: comando.id } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erro inesperado ao criar comando." };
  }
}

export interface AtualizarConfiguracaoInput {
  diasCobranca: number;
  diasRecolhimento: number;
  liberacaoAutomaticaQuitacao: boolean;
}

export async function atualizarConfiguracaoAction(input: AtualizarConfiguracaoInput): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Sessão expirada" };
    const { data: perfil } = await supabase.from("usuarios").select("loja_id, cargo").eq("id", user.id).single();
    if (!perfil) return { success: false, error: "Perfil não encontrado" };
    if (perfil.cargo !== "admin" && perfil.cargo !== "gerente") return { success: false, error: "Sem permissão para alterar configurações do NeoLoc." };

    if (input.diasCobranca < 1 || input.diasRecolhimento < 1) return { success: false, error: "Os prazos precisam ser de pelo menos 1 dia." };

    const { error } = await supabase
      .from("neoloc_configuracoes")
      .update({ dias_cobranca: input.diasCobranca, dias_recolhimento: input.diasRecolhimento, liberacao_automatica_quitacao: input.liberacaoAutomaticaQuitacao })
      .eq("loja_id", perfil.loja_id);

    if (error) return { success: false, error: error.message };
    revalidatePath("/neoloc/configuracoes");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erro inesperado ao salvar configuração." };
  }
}
