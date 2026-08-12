"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { crmCardSchema, crmFollowupSchema } from "./crm-pipeline.schema";
import { criarCard, moverCardEtapa, criarFollowup, concluirFollowup } from "./crm-pipeline.service";
import type { ActionResult, CrmEtapa } from "@/types";

export async function criarCardAction(formData: FormData): Promise<ActionResult> {
  const parsed = crmCardSchema.safeParse({
    cliente_id: String(formData.get("cliente_id") ?? ""),
    etapa_id: String(formData.get("etapa_id") ?? ""),
    titulo: String(formData.get("titulo") ?? ""),
    valor_estimado: String(formData.get("valor_estimado") ?? ""),
    responsavel_id: String(formData.get("responsavel_id") ?? ""),
  });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  try {
    await criarCard(parsed.data);
    revalidatePath("/crm");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao criar oportunidade" };
  }
}

export async function moverCardEtapaAction(cardId: string, etapaId: string): Promise<ActionResult> {
  try {
    await moverCardEtapa(cardId, etapaId);
    revalidatePath("/crm");

    // Avisa o cliente por WhatsApp quando o card muda de etapa —
    // melhor esforço, nunca derruba a movimentação se o envio falhar.
    try {
      const supabase = await createClient();
      const [{ data: card }, { data: etapa }] = await Promise.all([
        supabase.from("crm_cards").select("titulo, cliente:clientes(nome, whatsapp)").eq("id", cardId).maybeSingle(),
        supabase.from("crm_etapas").select("nome").eq("id", etapaId).maybeSingle(),
      ]);
      const cliente = card?.cliente as unknown as { nome: string; whatsapp: string } | null;
      if (cliente?.whatsapp && etapa?.nome) {
        const { getActiveProvider } = await import("@/services/whatsapp/providers/provider-resolver");
        const { paraFormatoInternacionalBR } = await import("@/utils/telefone");
        const provider = await getActiveProvider();
        const resultadoEnvio = await provider.enviarTexto(
          paraFormatoInternacionalBR(cliente.whatsapp),
          `Olá, ${cliente.nome.split(" ")[0]}! Seu atendimento na Neotec avançou pra etapa: *${etapa.nome}*.`
        );
        if (!resultadoEnvio.enviado) console.error("WhatsApp de mudança de etapa não foi entregue:", resultadoEnvio.motivo);
      }
    } catch (erroWhatsapp) {
      console.error("Falha ao enviar WhatsApp de mudança de etapa (não bloqueia a movimentação):", erroWhatsapp);
    }

    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao mover card" };
  }
}

export async function criarFollowupAction(formData: FormData): Promise<ActionResult> {
  const parsed = crmFollowupSchema.safeParse({
    card_id: String(formData.get("card_id") ?? ""),
    cliente_id: String(formData.get("cliente_id") ?? ""),
    data_agendada: String(formData.get("data_agendada") ?? ""),
    motivo: String(formData.get("motivo") ?? ""),
  });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Sessão expirada" };

    await criarFollowup({
      card_id: parsed.data.card_id || undefined,
      cliente_id: parsed.data.cliente_id || undefined,
      data_agendada: parsed.data.data_agendada,
      motivo: parsed.data.motivo,
      usuario_id: user.id,
    });
    revalidatePath("/crm");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao agendar follow-up" };
  }
}

export async function concluirFollowupAction(id: string): Promise<ActionResult> {
  try {
    await concluirFollowup(id);
    revalidatePath("/crm");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao concluir follow-up" };
  }
}

export async function marcarCardPerdidoAction(cardId: string, motivo: string): Promise<{ success: true; data: undefined } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("crm_cards")
      .update({ perdido: true, motivo_perda: motivo, status_recuperacao: "sem_retorno" })
      .eq("id", cardId);
    if (error) throw new Error(error.message);
    revalidatePath("/crm");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao marcar como perdido" };
  }
}

export async function reabrirCardAction(cardId: string): Promise<{ success: true; data: undefined } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("crm_cards")
      .update({ perdido: false, motivo_perda: null, status_recuperacao: "ativo" })
      .eq("id", cardId);
    if (error) throw new Error(error.message);
    revalidatePath("/crm");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao reabrir" };
  }
}

/** Botão "na verdade é venda" — cria um card no CRM de venda a partir de uma OS, e marca a OS com o vínculo. Nunca apaga a OS, só cria o card irmão. */
export async function moverParaCrmVendaAction(osId: string, clienteId: string): Promise<ActionResult<{ cardId: string }>> {
  try {
    const supabase = await createClient();

    const { data: primeiraEtapa } = await supabase.from("crm_etapas").select("id").eq("tipo", "venda").order("ordem").limit(1).maybeSingle();
    if (!primeiraEtapa) throw new Error("Nenhuma etapa de venda configurada");

    const { data: os } = await supabase.from("ordens_servico").select("numero_os").eq("id", osId).maybeSingle();

    const { data: card, error } = await supabase
      .from("crm_cards")
      .insert({ cliente_id: clienteId, etapa_id: primeiraEtapa.id, titulo: `Venda — a partir da OS ${os?.numero_os ?? ""}` })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await supabase.from("ordens_servico").update({ gerou_card_venda_id: card.id }).eq("id", osId);

    revalidatePath("/crm");
    revalidatePath("/assistencia");
    return { success: true, data: { cardId: card.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao mover pra venda" };
  }
}

/** Botão "na verdade é assistência" — cria uma OS a partir de um card do CRM de venda, e marca o card com o vínculo. Nunca apaga o card, só cria a OS irmã. */
export async function moverParaCrmAssistenciaAction(cardId: string, clienteId: string, defeitoRelatado: string): Promise<ActionResult<{ osId: string; numeroOS: string }>> {
  try {
    const { criarOrdemServico } = await import("@/services/assistencia/assistencia.service");
    const os = await criarOrdemServico({ cliente_id: clienteId, defeito: defeitoRelatado || "A definir" });

    const supabase = await createClient();
    await supabase.from("crm_cards").update({ convertido_em_os_id: os.id }).eq("id", cardId);

    revalidatePath("/crm");
    revalidatePath("/assistencia");
    return { success: true, data: { osId: os.id, numeroOS: os.numero_os } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao mover pra assistência" };
  }
}

/** Wrapper de listarEtapas como Server Action — permite chamar do client component sem importar o .service diretamente (que tem código de servidor e quebra o build se importado de client component). */
export async function listarEtapasAction(): Promise<ActionResult<CrmEtapa[]>> {
  try {
    const { listarEtapas } = await import("./crm-pipeline.service");
    const etapas = await listarEtapas();
    return { success: true, data: etapas };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao carregar etapas" };
  }
}
