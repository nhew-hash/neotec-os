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
import type { ActionResult, StatusAparelho, Produto } from "@/types";

function gerarSlug(nome: string): string {
  return nome
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove acento
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

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
    pecas_substituidas: formData.getAll("pecas_substituidas").map(String),
    observacoes: String(formData.get("observacoes") ?? ""),
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

export async function alternarPublicacaoLojaAparelhoAction(id: string, publicado: boolean): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const { data: aparelho, error: erroAparelho } = await supabase
      .from("aparelhos")
      .update({ disponivel_loja_virtual: publicado })
      .eq("id", id)
      .select("produto_id")
      .single();
    if (erroAparelho) throw new Error(erroAparelho.message);

    if (publicado) {
      // Publicar o aparelho sem publicar o produto-pai deixava tudo
      // invisível mesmo assim — o produto genérico é quem controla se
      // a página existe no catálogo. Publica os dois juntos.
      const { data: produto } = await supabase.from("produtos").select("nome, slug").eq("id", aparelho.produto_id).maybeSingle();
      const slug = produto?.slug ?? (produto ? `${gerarSlug(produto.nome)}-${aparelho.produto_id.slice(0, 6)}` : undefined);
      await supabase.from("produtos").update({ visivel_loja: true, ...(slug ? { slug } : {}) }).eq("id", aparelho.produto_id);
    } else {
      // Só esconde o produto-pai se não sobrar NENHUM outro aparelho
      // publicado dele — não quero derrubar unidades-irmãs que
      // continuam à venda.
      const { count } = await supabase
        .from("aparelhos")
        .select("id", { count: "exact", head: true })
        .eq("produto_id", aparelho.produto_id)
        .eq("disponivel_loja_virtual", true);
      if (!count) await supabase.from("produtos").update({ visivel_loja: false }).eq("id", aparelho.produto_id);
    }

    revalidatePath("/estoque");
    revalidatePath("/loja", "layout");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao atualizar" };
  }
}

/** Criação rápida de produto, direto do formulário de novo aparelho — sem precisar sair da tela e voltar. Devolve o produto criado pra já selecionar sozinho. */
export async function criarProdutoRapidoAction(input: { nome: string; categoria: string; marca?: string }): Promise<ActionResult<{ id: string; nome: string }>> {
  if (!input.nome.trim()) return { success: false, error: "Nome é obrigatório" };
  try {
    const produto = await criarProduto({
      nome: input.nome.trim(),
      categoria: input.categoria as Produto["categoria"],
      marca: input.marca || undefined,
    });
    revalidatePath("/estoque");
    return { success: true, data: { id: produto.id, nome: produto.nome } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao criar produto" };
  }
}

export async function atualizarMostrarTradeInAction(produtoId: string, valor: boolean): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("produtos").update({ mostrar_trade_in: valor }).eq("id", produtoId);
    if (error) throw new Error(error.message);
    revalidatePath("/estoque");
    revalidatePath("/loja", "layout");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao atualizar" };
  }
}

/** Apaga o aparelho de verdade — usado quando cadastro errado ou item que nunca deveria ter entrado no estoque. Sempre com confirmação na tela antes de chegar aqui. */
export async function apagarAparelhoAction(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const { data: aparelho } = await supabase.from("aparelhos").select("status").eq("id", id).maybeSingle();
    if (aparelho?.status === "vendido") {
      return { success: false, error: "Não dá pra apagar aparelho já vendido — isso destruiria o histórico da venda." };
    }

    const { error } = await supabase.from("aparelhos").delete().eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/estoque");
    revalidatePath("/loja", "layout");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao apagar aparelho" };
  }
}

/** Processa retiradas agendadas — chamado pelo cron diário. Despublica sozinho todo item cuja data de retirada já chegou. */
export async function processarRetiradasAgendadas(): Promise<{ produtos: number; aparelhos: number }> {
  const supabase = await createClient();
  const agora = new Date().toISOString();

  const { data: produtosRetirados } = await supabase
    .from("produtos")
    .update({ visivel_loja: false, retirar_em: null })
    .lte("retirar_em", agora)
    .not("retirar_em", "is", null)
    .select("id");

  const { data: aparelhosRetirados } = await supabase
    .from("aparelhos")
    .update({ disponivel_loja_virtual: false, retirar_em: null })
    .lte("retirar_em", agora)
    .not("retirar_em", "is", null)
    .select("id");

  return { produtos: produtosRetirados?.length ?? 0, aparelhos: aparelhosRetirados?.length ?? 0 };
}

/** Agenda ou cancela a retirada de um produto — usado pelos botões "Retirar agora" (imediato, chama diretamente a action de despublicar) e "Retirar em 1 dia útil" (agenda, cron processa depois). */
export async function agendarRetiradaProdutoAction(produtoId: string, diasUteis: number | null): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const retirarEm = diasUteis == null ? null : calcularDataDiasUteis(diasUteis);
    const { error } = await supabase.from("produtos").update({ retirar_em: retirarEm }).eq("id", produtoId);
    if (error) throw new Error(error.message);
    revalidatePath("/estoque");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao agendar" };
  }
}

export async function agendarRetiradaAparelhoAction(aparelhoId: string, diasUteis: number | null): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const retirarEm = diasUteis == null ? null : calcularDataDiasUteis(diasUteis);
    const { error } = await supabase.from("aparelhos").update({ retirar_em: retirarEm }).eq("id", aparelhoId);
    if (error) throw new Error(error.message);
    revalidatePath("/estoque");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao agendar" };
  }
}

/** Soma dias ÚTEIS (pula sábado e domingo) a partir de agora — "1 dia útil" numa sexta vira segunda, não sábado. */
function calcularDataDiasUteis(dias: number): string {
  const data = new Date();
  let restantes = dias;
  while (restantes > 0) {
    data.setDate(data.getDate() + 1);
    const diaSemana = data.getDay(); // 0=domingo, 6=sábado
    if (diaSemana !== 0 && diaSemana !== 6) restantes--;
  }
  return data.toISOString();
}

/** Retirar da loja AGORA — despublica na hora, cancela qualquer retirada agendada que existisse. */
export async function retirarProdutoDaLojaAction(produtoId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("produtos").update({ visivel_loja: false, retirar_em: null }).eq("id", produtoId);
    if (error) throw new Error(error.message);
    revalidatePath("/estoque");
    revalidatePath("/loja", "layout");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao retirar" };
  }
}

export async function retirarAparelhoDaLojaAction(aparelhoId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("aparelhos").update({ disponivel_loja_virtual: false, retirar_em: null }).eq("id", aparelhoId);
    if (error) throw new Error(error.message);
    revalidatePath("/estoque");
    revalidatePath("/loja", "layout");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao retirar" };
  }
}

/** Corrige categoria manualmente — útil quando a IA classificou errado (Central de Cadastro pode errar categoria nova, tipo "jbl" vs "acessorio"). */
export async function atualizarCategoriaProdutoAction(produtoId: string, categoria: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("produtos").update({ categoria }).eq("id", produtoId);
    if (error) throw new Error(error.message);
    revalidatePath("/estoque");
    revalidatePath("/loja", "layout");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao atualizar categoria" };
  }
}
