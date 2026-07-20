import { executarPromptIA } from "@/services/ia/ia.service";
import { buscarPrecoParaAtendimento } from "./ia-atendimento-busca.service";
import type { WhatsappMensagem } from "@/types";

export interface RespostaIAAtendimento {
  resposta: string;
  temperatura: "frio" | "morno" | "quente";
  querHumano: boolean;
  confiancaBaixa: boolean;
  sinaisDetectados: string[];
  objecao: string | null;
  resumo: string | null;
  proximaAcao: string | null;
}

const PALAVRAS_IGNORADAS = [
  "quanto", "custa", "custam", "voces", "vocês", "tem", "tem?", "preço", "preco", "de", "o", "a", "um", "uma", "quero", "queria",
  "gostaria", "saber", "valor", "qual", "?",
];

/** Heurística simples pra extrair o que parece ser o nome de um produto da mensagem — sem chamar IA pra isso, só pra decidir SE vale a pena buscar preço. */
function extrairTermoBusca(mensagem: string): string {
  return mensagem
    .toLowerCase()
    .replace(/[?!.,]/g, "")
    .split(/\s+/)
    .filter((palavra) => !PALAVRAS_IGNORADAS.includes(palavra) && palavra.length > 1)
    .join(" ")
    .trim();
}

function montarPromptSistemaAtendimento(promptNegocio: string | null): string {
  return `Você é o atendente virtual de uma assistência técnica e loja de celulares (Neotec). Responda em português do Brasil, tom cordial e direto, como uma pessoa de verdade atenderia — sem parecer robótico, sem excesso de formalidade.

${promptNegocio ? `INFORMAÇÕES DO NEGÓCIO (definidas pelo dono):\n${promptNegocio}\n` : ""}

REGRAS QUE VOCÊ NUNCA PODE QUEBRAR:

1. NUNCA invente um preço. Se não vier nenhum "PREÇO ENCONTRADO" nesta conversa, você NÃO SABE o preço — diga isso com naturalidade (ex: "deixa eu confirmar isso com a equipe") e marque confianca_baixa como true.

2. Se o cliente disser, de qualquer jeito, que quer falar com uma pessoa/atendente/humano — marque quer_humano como true e responda algo breve tipo "Já te encaminho com alguém da equipe!", sem insistir em continuar sozinho.

3. Se você não tiver certeza de como responder algo (pergunta fora do que você sabe, reclamação, negociação de preço complexa, qualquer coisa emocionalmente delicada) — marque confianca_baixa como true e dê uma resposta breve e gentil dizendo que vai verificar, SEM tentar resolver sozinho.

4. Se o cliente disser que achou caro ou reclamar do preço — NÃO desiste da venda. Responda perguntando qual valor ele tinha em mente, oferecendo verificar a melhor condição (ex: "Entendi. Pra eu te ajudar melhor, qual valor você estava pensando? Vou ver a melhor opção pra você."). Marque objecao como "preco".

CLASSIFICAÇÃO DE TEMPERATURA (campo temperatura):
- "quente": cliente quer comprar, perguntou forma de pagamento, pediu pra reservar o aparelho, ou está comparando modelos ativamente pra decidir.
- "morno": cliente está pesquisando, perguntando preço sem urgência, ainda avaliando.
- "frio": só pediu uma informação pontual, sem sinal de intenção de compra.

SINAIS DE COMPRA (campo sinais — pode ter mais de um, ou lista vazia):
- "perguntou_preco": perguntou quanto custa algum aparelho
- "perguntou_disponibilidade": perguntou se tem em estoque/disponível
- "pediu_condicao_pagamento": perguntou sobre parcelamento, cartão, pix, forma de pagamento
- "informou_compra_hoje": disse que quer/vai comprar hoje ou agora
- "pediu_reserva": pediu pra guardar/reservar um aparelho específico
- "comparou_modelos": perguntou a diferença entre dois ou mais modelos, ou pediu comparação

Responda APENAS com um JSON no formato:
{"resposta": "...", "temperatura": "frio"|"morno"|"quente", "quer_humano": true|false, "confianca_baixa": true|false, "sinais": ["perguntou_preco", ...], "objecao": "preco"|null, "resumo": "resumo curto (1 frase) do que esse cliente quer e em que pé está a conversa", "proxima_acao": "o que fazer a seguir com esse lead, 1 frase curta, ou null se não houver ação clara"}`;
}

/**
 * Gera a resposta da IA de atendimento pra uma mensagem de cliente.
 * Busca preço ANTES de chamar a IA (RAG simples: recupera primeiro,
 * gera depois) — a IA nunca "adivinha" preço, só repete o que veio de
 * uma consulta real ao banco, injetada no prompt como fato.
 */
export async function gerarRespostaAtendimento(input: {
  mensagemCliente: string;
  historico: Pick<WhatsappMensagem, "direcao" | "conteudo">[];
  promptNegocio: string | null;
}): Promise<RespostaIAAtendimento> {
  const termoBusca = extrairTermoBusca(input.mensagemCliente);
  const precosEncontrados = termoBusca.length >= 2 ? await buscarPrecoParaAtendimento(termoBusca) : [];

  const contextoPreco = precosEncontrados.length > 0
    ? `\nPREÇO ENCONTRADO (use exatamente estes dados, nunca outros):\n${precosEncontrados
        .map((p) => `- ${p.modelo} ${p.detalhes} — R$ ${p.preco.toFixed(2)} (fonte: ${p.fornecedorOuOrigem}, ${p.dataReferencia})`)
        .join("\n")}`
    : "\nNenhum preço encontrado nas fontes disponíveis pra essa pergunta.";

  const historicoTexto = input.historico
    .slice(-6)
    .map((m) => `${m.direcao === "entrada" ? "Cliente" : "Loja"}: ${m.conteudo}`)
    .join("\n");

  const prompt = `${historicoTexto ? `Histórico recente da conversa:\n${historicoTexto}\n\n` : ""}Mensagem nova do cliente: "${input.mensagemCliente}"
${contextoPreco}`;

  const resultado = await executarPromptIA({
    modulo: "atendimento",
    prompt,
    sistema: montarPromptSistemaAtendimento(input.promptNegocio),
    formatoJson: true,
    temperatura: 0.4,
  });

  try {
    const parsed = JSON.parse(resultado.texto) as Record<string, unknown>;
    return {
      resposta: typeof parsed.resposta === "string" ? parsed.resposta : "Só um momento, já te respondo!",
      temperatura: parsed.temperatura === "quente" || parsed.temperatura === "morno" ? parsed.temperatura : "frio",
      querHumano: parsed.quer_humano === true,
      confiancaBaixa: parsed.confianca_baixa === true,
      sinaisDetectados: Array.isArray(parsed.sinais) ? parsed.sinais.filter((s): s is string => typeof s === "string") : [],
      objecao: typeof parsed.objecao === "string" ? parsed.objecao : null,
      resumo: typeof parsed.resumo === "string" ? parsed.resumo : null,
      proximaAcao: typeof parsed.proxima_acao === "string" ? parsed.proxima_acao : null,
    };
  } catch {
    // Formato inesperado da IA — trata como "não sei responder", nunca
    // manda algo não estruturado direto pro cliente.
    return {
      resposta: "Já te encaminho com alguém da equipe!", temperatura: "frio", querHumano: false, confiancaBaixa: true,
      sinaisDetectados: [], objecao: null, resumo: null, proximaAcao: null,
    };
  }
}
