import { z } from "zod";
import { executarPromptIA } from "./ia.service";
import { extrairResumoAnuncioReferencia } from "@/services/loja/produto-quente-ml.service";
import { labelCategoria } from "@/components/loja/categorias";
import type { Produto } from "@/types";

/**
 * Shape do conteúdo comercial gerado por IA pra página "Produto
 * Quente" — salvo solto em `produtos.produto_quente_conteudo` (jsonb),
 * editável manualmente depois no admin (nunca um page builder, texto
 * simples por seção — item 23 do brief).
 */
const conteudoSchema = z.object({
  headline: z.string(),
  subtitulo: z.string().nullable(),
  beneficios: z.array(z.string()),
  destaques: z.array(z.string()),
  faq: z.array(z.object({ pergunta: z.string(), resposta: z.string() })),
  objecoes: z.array(z.object({ objecao: z.string(), resposta: z.string() })),
  descricaoComercial: z.string(),
});

export type ConteudoProdutoQuente = z.infer<typeof conteudoSchema>;

const PROMPT_SISTEMA = `Você é um redator publicitário que transforma dados reais de um produto em uma página de vendas de alta conversão, para uma loja de tecnologia chamada Neotec (Araguari, MG).

REGRA MAIS IMPORTANTE, sem exceção: use SOMENTE as informações fornecidas no prompt do usuário. NUNCA invente característica técnica, número, capacidade, resultado, avaliação ou dado que não esteja explicitamente ali. Se uma informação não foi fornecida, simplesmente não fale sobre ela — não complete com "provavelmente", não estime, não generalize de produtos parecidos.

Você pode e deve: reescrever dados técnicos como benefícios compreensíveis (ex: transformar uma especificação em "para que serve" na prática), criar headline/subtítulo/textos de venda persuasivos, e gerar perguntas frequentes plausíveis — mas as RESPOSTAS do FAQ também só podem usar dado fornecido; se a pergunta não tiver resposta nos dados, não a inclua.

Responda APENAS com um objeto JSON no formato exato abaixo:
{
  "headline": "string curta e impactante",
  "subtitulo": "string ou null",
  "beneficios": ["string", "..."],
  "destaques": ["string", "..."],
  "faq": [{"pergunta": "string", "resposta": "string"}],
  "objecoes": [{"objecao": "string", "resposta": "string"}],
  "descricaoComercial": "string, um ou dois parágrafos"
}

Se muito pouco dado foi fornecido, gere um conteúdo mais enxuto (menos itens em cada lista) em vez de inventar pra preencher — um array vazio [] é uma resposta válida e preferível a conteúdo inventado.`;

function montarPrompt(produto: Produto, resumoReferencia: string | null): string {
  const partes: string[] = [
    `Nome: ${produto.nome}`,
    `Categoria: ${labelCategoria(produto.categoria)}`,
  ];
  if (produto.marca) partes.push(`Marca: ${produto.marca}`);
  if (produto.modelo) partes.push(`Modelo: ${produto.modelo}`);
  if (produto.preco_venda != null) partes.push(`Preço: R$ ${produto.preco_venda}`);
  if (produto.descricao_loja) partes.push(`Descrição pública já cadastrada: ${produto.descricao_loja}`);
  if (produto.descricao && produto.descricao !== produto.descricao_loja) partes.push(`Observações internas do cadastro (podem conter specs úteis): ${produto.descricao}`);
  if (produto.selos_manuais.length > 0) partes.push(`Selos/destaques manuais já definidos pela loja: ${produto.selos_manuais.join(", ")}`);
  if (resumoReferencia) partes.push(`\nResumo extraído de um anúncio de referência (use como fonte adicional de specs/descrição, nunca copie literalmente, nunca inclua preço de outro lugar que não o preço real acima):\n${resumoReferencia}`);

  return partes.join("\n");
}

/**
 * Gera (ou regenera) o conteúdo da página Produto Quente pra um
 * produto. Sempre passa pelo ponto único de entrada de IA
 * (`executarPromptIA`) — nunca chama provider direto. Sem cache: cada
 * chamada é uma geração/regeneração explícita do admin, não uma leitura
 * repetida do mesmo prompt.
 */
export async function gerarConteudoProdutoQuente(produto: Produto): Promise<ConteudoProdutoQuente> {
  let resumoReferencia: string | null = null;

  if (produto.produto_quente_link_ml) {
    // Best-effort — se falhar ou não achar nada, segue só com o dado real já cadastrado.
    const resumo = await extrairResumoAnuncioReferencia(produto.produto_quente_link_ml).catch(() => null);
    if (resumo) {
      resumoReferencia = [resumo.titulo && `Título do anúncio: ${resumo.titulo}`, resumo.descricao && `Descrição do anúncio: ${resumo.descricao}`]
        .filter(Boolean)
        .join("\n");
    }
  }

  const resultado = await executarPromptIA({
    modulo: "produto_quente",
    prompt: montarPrompt(produto, resumoReferencia || null),
    sistema: PROMPT_SISTEMA,
    temperatura: 0.6,
    formatoJson: true,
  });

  let bruto: unknown;
  try {
    bruto = JSON.parse(resultado.texto);
  } catch {
    throw new Error("A IA não devolveu um JSON válido — tenta gerar de novo.");
  }

  const parsed = conteudoSchema.safeParse(bruto);
  if (!parsed.success) throw new Error("A IA devolveu o conteúdo em formato inesperado — tenta gerar de novo.");
  return parsed.data;
}
