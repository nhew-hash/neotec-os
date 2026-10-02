import { createClient } from "@/lib/supabase/server";
import type { CreativeBrief } from "@/types";

export async function listarBriefs(): Promise<CreativeBrief[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("creative_briefs").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(`Não foi possível carregar os briefs: ${error.message}`);
  return data ?? [];
}

export async function criarBrief(input: { objetivo: string; produto?: string; publico?: string; hipotese?: string; hook_id?: string }): Promise<CreativeBrief> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("creative_briefs")
    .insert({
      objetivo: input.objetivo,
      produto: input.produto ?? null,
      publico: input.publico ?? null,
      hipotese: input.hipotese ?? null,
      hook_id: input.hook_id ?? null,
      created_by: user?.id ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(`Não foi possível criar o brief: ${error.message}`);
  return data;
}

/**
 * Gera roteiro + copy com o Claude (Seção 18: "Claude = estratégia,
 * pesquisa, roteiro, copy, briefing"). Passa o hook escolhido (se houver)
 * como referência de estrutura — nunca copia um criativo de terceiro.
 */
export async function gerarRoteiroECopy(briefId: string): Promise<CreativeBrief> {
  const supabase = await createClient();
  const { data: brief } = await supabase.from("creative_briefs").select("*, hook:hooks_biblioteca(texto, categoria)").eq("id", briefId).single();
  if (!brief) throw new Error("Brief não encontrado");

  const hookInfo = brief.hook as { texto: string; categoria: string } | null;

  const { executarPromptIA } = await import("@/services/ia/ia.service");
  const resultado = await executarPromptIA({
    modulo: "neo_performance_creative",
    sistema:
      "Você é estrategista de performance e copywriter de anúncios para uma loja de celulares (Neotec). " +
      "Responda SOMENTE um JSON com as chaves: roteiro (texto do roteiro do anúncio, com marcações de cena/fala quando fizer sentido) e copy (legenda/texto do anúncio, curto e direto). " +
      "Nunca prometa ganho garantido, nunca invente número exato de preço/desconto, nunca use alegação de prova que não foi dada.",
    prompt: [
      `Objetivo: ${brief.objetivo}`,
      brief.produto ? `Produto: ${brief.produto}` : null,
      brief.publico ? `Público: ${brief.publico}` : null,
      brief.hipotese ? `Hipótese: ${brief.hipotese}` : null,
      hookInfo ? `Hook de referência (categoria ${hookInfo.categoria}): ${hookInfo.texto}` : null,
    ].filter(Boolean).join("\n"),
    formatoJson: true,
  });

  const { roteiro, copy } = JSON.parse(resultado.texto) as { roteiro: string; copy: string };
  const { data, error } = await supabase.from("creative_briefs").update({ roteiro, copy, status: "pronto" }).eq("id", briefId).select("*").single();
  if (error) throw new Error(`Não foi possível salvar o roteiro/copy: ${error.message}`);
  return data;
}

/**
 * Geração/edição de imagem via Gemini (Seção 18: "Gemini = geração,
 * edição, variações visuais"). NÃO IMPLEMENTADA de verdade nesta fase:
 * não existe cliente de geração de imagem no projeto. `GEMINI_API_KEY`
 * (já configurável) é usada só pra texto, pelo módulo de Cotações/IA —
 * geração de imagem precisa de `GEMINI_IMAGE_API_KEY` (ver
 * .env.local.example), que é uma credencial separada. Por Seção 57
 * ("não fingir integração"), esta função nunca retorna uma URL de imagem
 * falsa: ela checa a pré-condição e avisa claramente o que falta. Quando
 * a chave existir, a chamada real à API de imagem entra no lugar do
 * throw abaixo.
 */
export async function gerarImagemCriativo(_briefId: string, _descricaoCena: string): Promise<never> {
  const temChave = Boolean(process.env.GEMINI_IMAGE_API_KEY);
  throw new Error(
    temChave
      ? "Geração de imagem com Gemini ainda não está implementada nesta fase — a chave está configurada, falta o código de chamada à API."
      : "Geração de imagem com Gemini não configurada: falta GEMINI_IMAGE_API_KEY no ambiente."
  );
}
