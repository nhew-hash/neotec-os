import { createClient } from "@/lib/supabase/server";
import { executarPromptIA } from "@/services/ia/ia.service";

export interface RespostasQuiz {
  orcamentoMax: number;
  prioridade: "camera" | "bateria" | "desempenho" | "jogos" | "trabalho";
  condicao: "novo" | "seminovo" | "qualquer";
}

export interface RecomendacaoQuiz {
  nome: string;
  preco: number;
  condicao: string;
  slug: string; // link — "loja/produto/{slug}" (genérico) ou "loja/lacrados/{slug}" (lacrado)
  tipoLink: "produto" | "lacrado";
  porQue: string;
}

interface CandidatoInterno {
  nome: string;
  preco: number;
  condicao: string;
  slug: string;
  tipoLink: "produto" | "lacrado";
  pontuacao: number;
}

/**
 * Pontuação heurística por nome do modelo — não existe uma tabela de
 * especificações técnicas estruturada no catálogo hoje (câmera em
 * lux, autonomia em horas, etc.), então a pontuação usa sinais que já
 * existem no próprio nome do produto. É honesto sobre a limitação: um
 * "Pro Max" pontua mais em câmera/desempenho por ser objetivamente a
 * linha com o melhor conjunto de câmeras/chip da geração, não por
 * inventar um dado que não temos.
 */
function pontuarPorPrioridade(nome: string, prioridade: RespostasQuiz["prioridade"]): number {
  const n = nome.toLowerCase();
  let pontos = 0;

  if (prioridade === "camera" || prioridade === "desempenho" || prioridade === "jogos") {
    if (n.includes("pro max")) pontos += 3;
    else if (n.includes("pro")) pontos += 2;
  }
  if (prioridade === "bateria") {
    if (n.includes("pro max") || n.includes("plus") || n.includes("max")) pontos += 3;
  }
  if (prioridade === "trabalho") {
    if (n.includes("pro")) pontos += 2;
    else pontos += 1; // qualquer iPhone atual dá conta de trabalho básico — não penaliza modelo base
  }

  // Geração mais recente pontua um pouco mais, em qualquer prioridade — sinal simples e real (número do modelo).
  const match = n.match(/(\d{2})/);
  if (match) pontos += Number(match[1]) / 10;

  return pontos;
}

async function buscarCandidatosReais(respostas: RespostasQuiz): Promise<CandidatoInterno[]> {
  const supabase = await createClient();
  const candidatos: CandidatoInterno[] = [];

  // Lacrados — variantes com estoque real, dentro do orçamento.
  if (respostas.condicao !== "seminovo") {
    const { data: variantes } = await supabase
      .from("catalogo_lacrados_variantes")
      .select("preco_venda, modelo:catalogo_lacrados_modelos(nome)")
      .gt("quantidade", 0)
      .not("preco_venda", "is", null)
      .lte("preco_venda", respostas.orcamentoMax);

    (variantes ?? []).forEach((v) => {
      const modelo = v.modelo as unknown as { nome: string } | null;
      if (!modelo || v.preco_venda == null) return;
      candidatos.push({
        nome: modelo.nome,
        preco: v.preco_venda,
        condicao: "Lacrado",
        slug: slugify(modelo.nome),
        tipoLink: "lacrado",
        pontuacao: pontuarPorPrioridade(modelo.nome, respostas.prioridade),
      });
    });
  }

  // Seminovos — aparelhos disponíveis de verdade, dentro do orçamento.
  if (respostas.condicao !== "novo") {
    const { data: aparelhos } = await supabase
      .from("aparelhos")
      .select("preco_venda, condicao, produto:produtos(nome, slug, visivel_loja)")
      .eq("status", "disponivel")
      .not("preco_venda", "is", null)
      .lte("preco_venda", respostas.orcamentoMax);

    (aparelhos ?? []).forEach((a) => {
      const produto = a.produto as unknown as { nome: string; slug: string | null; visivel_loja: boolean } | null;
      if (!produto || !produto.visivel_loja || !produto.slug || a.preco_venda == null) return;
      candidatos.push({
        nome: produto.nome,
        preco: a.preco_venda,
        condicao: a.condicao === "seminovo" ? "Seminovo" : "Usado",
        slug: produto.slug,
        tipoLink: "produto",
        pontuacao: pontuarPorPrioridade(produto.nome, respostas.prioridade),
      });
    });
  }

  return candidatos.sort((a, b) => b.pontuacao - a.pontuacao).slice(0, 3);
}

function slugify(nome: string): string {
  return nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const LABEL_PRIORIDADE: Record<RespostasQuiz["prioridade"], string> = {
  camera: "câmera", bateria: "duração de bateria", desempenho: "desempenho geral", jogos: "jogos", trabalho: "uso pra trabalho",
};

/**
 * A IA só recebe os 3 candidatos JÁ selecionados por regra (dado real
 * de estoque/preço) — a tarefa dela é só escrever a explicação de por
 * que cada um faz sentido pra prioridade escolhida, nunca inventar
 * produto, preço ou especificação que não veio na lista.
 */
export async function gerarRecomendacoesQuiz(respostas: RespostasQuiz): Promise<RecomendacaoQuiz[]> {
  const candidatos = await buscarCandidatosReais(respostas);
  if (candidatos.length === 0) return [];

  const prompt = `Prioridade do cliente: ${LABEL_PRIORIDADE[respostas.prioridade]}. Orçamento até R$ ${respostas.orcamentoMax}.

Aparelhos disponíveis (JÁ selecionados por regra — não sugira nenhum fora dessa lista, não invente especificação que não está aqui):
${candidatos.map((c, i) => `${i + 1}. ${c.nome} (${c.condicao}) — R$ ${c.preco}`).join("\n")}

Pra cada aparelho da lista, escreva 1 frase curta (máximo 20 palavras) explicando por que ele atende à prioridade do cliente. Responda em JSON: {"explicacoes": ["frase 1", "frase 2", "frase 3"]}`;

  try {
    const resultado = await executarPromptIA({
      modulo: "quiz_iphone_ideal",
      prompt,
      sistema: "Você é um consultor de vendas da Neotec, especialista em iPhone. Seja direto, honesto, sem exagero de marketing.",
      temperatura: 0.4,
      formatoJson: true,
    });

    const parsed = JSON.parse(resultado.texto);
    const explicacoes: string[] = Array.isArray(parsed?.explicacoes) ? parsed.explicacoes : [];

    return candidatos.map((c, i) => ({
      nome: c.nome,
      preco: c.preco,
      condicao: c.condicao,
      slug: c.slug,
      tipoLink: c.tipoLink,
      porQue: explicacoes[i] ?? `Boa opção com foco em ${LABEL_PRIORIDADE[respostas.prioridade]}, dentro do seu orçamento.`,
    }));
  } catch {
    // Se a IA falhar por qualquer motivo, ainda devolve os candidatos reais — só sem a explicação personalizada.
    return candidatos.map((c) => ({
      nome: c.nome, preco: c.preco, condicao: c.condicao, slug: c.slug, tipoLink: c.tipoLink,
      porQue: `Boa opção com foco em ${LABEL_PRIORIDADE[respostas.prioridade]}, dentro do seu orçamento.`,
    }));
  }
}
