"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ordemServicoSchema, diagnosticoSchema, pecaOsSchema, checklistOsSchema } from "./assistencia.schema";
import {
  criarOrdemServico, atualizarStatusOS, salvarDiagnostico, adicionarPecaOS, salvarChecklistOS,
} from "./assistencia.service";
import { criarCliente } from "@/services/clientes/clientes.service";
import type { ActionResult, StatusOS, TipoChecklistOS } from "@/types";

export async function criarOSAction(formData: FormData): Promise<ActionResult<{ id: string; numero: string }>> {
  const raw = {
    cliente_id: String(formData.get("cliente_id") ?? ""),
    cliente_novo_nome: String(formData.get("cliente_novo_nome") ?? ""),
    cliente_novo_whatsapp: String(formData.get("cliente_novo_whatsapp") ?? ""),
    aparelho_id: String(formData.get("aparelho_id") ?? ""),
    aparelho_descricao: String(formData.get("aparelho_descricao") ?? ""),
    defeito: String(formData.get("defeito") ?? ""),
    garantia_dias: String(formData.get("garantia_dias") ?? ""),
    prazo: String(formData.get("prazo") ?? ""),
    urgente: formData.get("urgente") === "on",
    liga: formData.get("liga") === "on",
    molhado: formData.get("molhado") === "on",
    arranhado: formData.get("arranhado") === "on",
    tela: formData.get("tela") === "on",
    face_id: formData.get("face_id") === "on",
    touch: formData.get("touch") === "on",
    botoes: formData.get("botoes") === "on",
    cameras: formData.get("cameras") === "on",
    biometria: formData.get("biometria") === "on",
    senha_informada: formData.get("senha_informada") === "on",
    senha_valor: String(formData.get("senha_valor") ?? ""),
    senha_tipo: String(formData.get("senha_tipo") ?? "") || undefined,
    observacoes: String(formData.get("observacoes") ?? ""),
  };
  const parsed = ordemServicoSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  try {
    let clienteId = parsed.data.cliente_id;

    // Cliente novo, cadastrado ali mesmo — sem sair da tela de nova OS.
    if (!clienteId && parsed.data.cliente_novo_nome && parsed.data.cliente_novo_whatsapp) {
      const clienteCriado = await criarCliente({
        nome: parsed.data.cliente_novo_nome,
        whatsapp: parsed.data.cliente_novo_whatsapp,
      });
      clienteId = clienteCriado.id;
    }

    if (!clienteId) return { success: false, error: "Selecione um cliente ou cadastre um novo" };

    const os = await criarOrdemServico({
      cliente_id: clienteId,
      aparelho_id: parsed.data.aparelho_id,
      aparelho_descricao: parsed.data.aparelho_descricao,
      defeito: parsed.data.defeito,
      garantia_dias: parsed.data.garantia_dias,
      prazo: parsed.data.prazo,
      urgente: parsed.data.urgente,
    });

    // Checklist de recebimento — mesma tela, mesma submissão.
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await salvarChecklistOS(
        os.id,
        "recebimento",
        {
          liga: parsed.data.liga, molhado: parsed.data.molhado, arranhado: parsed.data.arranhado,
          tela: parsed.data.tela, face_id: parsed.data.face_id, touch: parsed.data.touch,
          botoes: parsed.data.botoes, cameras: parsed.data.cameras, biometria: parsed.data.biometria,
          senha_informada: parsed.data.senha_informada,
          senha_valor: parsed.data.senha_valor || null,
          senha_tipo: parsed.data.senha_tipo ?? null,
          observacoes: parsed.data.observacoes || null,
        },
        user.id
      );
    }

    revalidatePath("/assistencia");
    revalidatePath("/clientes");
    return { success: true, data: { id: os.id, numero: os.numero_os } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao abrir OS" };
  }
}

export async function atualizarStatusOSAction(id: string, status: StatusOS): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await atualizarStatusOS(id, status, user?.id);
    revalidatePath(`/assistencia/${id}`);
    revalidatePath("/assistencia");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao atualizar status" };
  }
}

export async function salvarDiagnosticoAction(id: string, formData: FormData): Promise<ActionResult> {
  const parsed = diagnosticoSchema.safeParse({
    diagnostico: String(formData.get("diagnostico") ?? ""),
    valor: String(formData.get("valor") ?? ""),
  });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  try {
    await salvarDiagnostico(id, parsed.data.diagnostico, parsed.data.valor);
    revalidatePath(`/assistencia/${id}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar diagnóstico" };
  }
}

export async function adicionarPecaOSAction(osId: string, formData: FormData): Promise<ActionResult> {
  const parsed = pecaOsSchema.safeParse({
    produto_id: String(formData.get("produto_id") ?? ""),
    quantidade: String(formData.get("quantidade") ?? "1"),
  });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Sessão expirada" };

    await adicionarPecaOS(osId, parsed.data.produto_id, parsed.data.quantidade, user.id);
    revalidatePath(`/assistencia/${osId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao adicionar peça" };
  }
}

export async function salvarChecklistOSAction(
  osId: string,
  tipo: TipoChecklistOS,
  formData: FormData
): Promise<ActionResult> {
  const raw = {
    liga: formData.get("liga") === "on",
    molhado: formData.get("molhado") === "on",
    arranhado: formData.get("arranhado") === "on",
    tela: formData.get("tela") === "on",
    face_id: formData.get("face_id") === "on",
    touch: formData.get("touch") === "on",
    botoes: formData.get("botoes") === "on",
    cameras: formData.get("cameras") === "on",
    biometria: formData.get("biometria") === "on",
    senha_informada: formData.get("senha_informada") === "on",
    senha_valor: String(formData.get("senha_valor") ?? ""),
    senha_tipo: String(formData.get("senha_tipo") ?? "") || undefined,
    observacoes: String(formData.get("observacoes") ?? ""),
  };
  const parsed = checklistOsSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: "Checklist inválido" };

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Sessão expirada" };

    await salvarChecklistOS(
      osId,
      tipo,
      {
        ...parsed.data,
        observacoes: parsed.data.observacoes || null,
        senha_valor: parsed.data.senha_valor || null,
        senha_tipo: parsed.data.senha_tipo ?? null,
      },
      user.id
    );
    revalidatePath(`/assistencia/${osId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar checklist" };
  }
}
