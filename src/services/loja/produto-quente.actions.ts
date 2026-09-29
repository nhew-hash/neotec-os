"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { gerarConteudoProdutoQuente } from "@/services/ia/produto-quente-ia.service";
import type { ActionResult, Produto } from "@/types";

/**
 * Liga/desliga o recurso Produto Quente pra um produto — mesmo padrão
 * de `atualizarMostrarTradeInAction` (toggle simples e direto na
 * tabela). Ao LIGAR, dispara a geração de conteúdo por IA
 * automaticamente (decisão do dono: ativar já entrega a página pronta,
 * sem precisar de um segundo clique) — ao desligar, só desliga, nunca
 * apaga o conteúdo já gerado (se ligar de novo depois, o conteúdo
 * anterior continua lá até alguém regenerar).
 */
export async function ativarProdutoQuenteAction(produtoId: string, ligar: boolean): Promise<ActionResult<{ conteudoGerado: boolean }>> {
  try {
    const supabase = await createClient();

    const { error: erroToggle } = await supabase.from("produtos").update({ produto_quente: ligar }).eq("id", produtoId);
    if (erroToggle) throw new Error(erroToggle.message);

    revalidatePath("/estoque");
    revalidatePath("/loja", "layout");

    if (!ligar) return { success: true, data: { conteudoGerado: false } };

    // Liga primeiro, gera depois — se a geração falhar (IA fora do ar,
    // link do Mercado Livre inválido, etc), o toggle já ficou ativo
    // (o admin pode tentar "Regenerar" depois) em vez de a ativação
    // inteira falhar por causa só do texto de marketing.
    const resultadoGeracao = await regenerarConteudoProdutoQuenteAction(produtoId);
    return { success: true, data: { conteudoGerado: resultadoGeracao.success } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao atualizar Produto Quente" };
  }
}

/** Salva/atualiza o link de referência (ex: Mercado Livre) — não regenera o conteúdo sozinho, é só o dado; regenerar é uma ação separada e explícita. */
export async function atualizarLinkMlProdutoQuenteAction(produtoId: string, link: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("produtos").update({ produto_quente_link_ml: link.trim() || null }).eq("id", produtoId);
    if (error) throw new Error(error.message);
    revalidatePath("/estoque");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar o link" };
  }
}

/** Salva/atualiza o vídeo (YouTube ou link direto .mp4) da página quente. Opcional — string vazia limpa o campo, e a seção de vídeo simplesmente não aparece. */
export async function atualizarVideoProdutoQuenteAction(produtoId: string, url: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("produtos").update({ produto_quente_video_url: url.trim() || null }).eq("id", produtoId);
    if (error) throw new Error(error.message);
    revalidatePath("/estoque");
    revalidatePath("/loja", "layout");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar o vídeo" };
  }
}

/** Gera (ou regenera) o conteúdo da página quente a partir do estado atual do produto (inclusive o link do Mercado Livre, se houver). */
export async function regenerarConteudoProdutoQuenteAction(produtoId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: produto, error: erroBusca } = await supabase.from("produtos").select("*").eq("id", produtoId).maybeSingle<Produto>();
    if (erroBusca) throw new Error(erroBusca.message);
    if (!produto) return { success: false, error: "Produto não encontrado" };

    const conteudo = await gerarConteudoProdutoQuente(produto);

    const { error: erroSalvar } = await supabase.from("produtos").update({ produto_quente_conteudo: conteudo }).eq("id", produtoId);
    if (erroSalvar) throw new Error(erroSalvar.message);

    revalidatePath("/estoque");
    revalidatePath("/loja", "layout");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao gerar o conteúdo com IA" };
  }
}
