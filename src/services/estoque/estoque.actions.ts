"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { produtoSchema, aparelhoSchema, testeAparelhoSchema } from "./estoque.schema";
import {
  criarProduto,
  criarAparelho,
  atualizarStatusAparelho,
  salvarTesteAparelho,
} from "./estoque.service";
import type { ActionResult, StatusAparelho } from "@/types";

export async function criarProdutoAction(formData: FormData): Promise<ActionResult> {
  const raw = {
    categoria: String(formData.get("categoria") ?? ""),
    marca: String(formData.get("marca") ?? ""),
    modelo: String(formData.get("modelo") ?? ""),
    nome: String(formData.get("nome") ?? ""),
    descricao: String(formData.get("descricao") ?? ""),
    preco_venda: String(formData.get("preco_venda") ?? ""),
    custo: String(formData.get("custo") ?? ""),
    estoque_minimo: String(formData.get("estoque_minimo") ?? "0"),
  };

  const parsed = produtoSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  try {
    await criarProduto(parsed.data);
    revalidatePath("/estoque");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao criar produto" };
  }
}

export async function criarAparelhoAction(formData: FormData): Promise<ActionResult> {
  const raw = {
    produto_id: String(formData.get("produto_id") ?? ""),
    imei: String(formData.get("imei") ?? ""),
    numero_serie: String(formData.get("numero_serie") ?? ""),
    cor: String(formData.get("cor") ?? ""),
    memoria: String(formData.get("memoria") ?? ""),
    bateria: String(formData.get("bateria") ?? ""),
    condicao: String(formData.get("condicao") ?? ""),
    custo: String(formData.get("custo") ?? ""),
    preco_venda: String(formData.get("preco_venda") ?? ""),
    preco_minimo: String(formData.get("preco_minimo") ?? ""),
    preco_sugerido: String(formData.get("preco_sugerido") ?? ""),
    fornecedor: String(formData.get("fornecedor") ?? ""),
    origem_entrada: String(formData.get("origem_entrada") ?? "fornecedor"),
    investidor_id: String(formData.get("investidor_id") ?? ""),
  };

  const parsed = aparelhoSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  try {
    await criarAparelho(parsed.data);
    revalidatePath("/estoque");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao cadastrar aparelho" };
  }
}

export async function atualizarStatusAparelhoAction(
  id: string,
  status: StatusAparelho
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Sessão expirada, faça login novamente" };

    await atualizarStatusAparelho(id, status, user.id);
    revalidatePath(`/estoque/aparelhos/${id}`);
    revalidatePath("/estoque");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao atualizar status" };
  }
}

export async function salvarTesteAparelhoAction(
  aparelhoId: string,
  formData: FormData
): Promise<ActionResult> {
  const raw = {
    face_id: formData.get("face_id") === "on",
    camera: formData.get("camera") === "on",
    tela: formData.get("tela") === "on",
    som: formData.get("som") === "on",
    microfone: formData.get("microfone") === "on",
    wifi: formData.get("wifi") === "on",
    bluetooth: formData.get("bluetooth") === "on",
    carregamento: formData.get("carregamento") === "on",
    observacoes: String(formData.get("observacoes") ?? ""),
  };

  const parsed = testeAparelhoSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: "Dados do checklist inválidos" };

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Sessão expirada, faça login novamente" };

    await salvarTesteAparelho(
      aparelhoId,
      { ...parsed.data, observacoes: parsed.data.observacoes || null },
      user.id
    );
    revalidatePath(`/estoque/aparelhos/${aparelhoId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar teste" };
  }
}
