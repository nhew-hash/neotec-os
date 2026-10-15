/**
 * Roteiro de atendimento do Manual de Vendas Neotec (treinamento da Júlia):
 * "Primeiro eu entendo. Depois eu indico. Em seguida eu negocio. E, por fim, eu
 * conduzo ao fechamento." Parte PURA: falas, perguntas, objeções, a frase de
 * confirmação e a escolha de UMA indicação principal + uma alternativa.
 * Nada aqui inventa preço, desconto, brinde ou prazo.
 */
import type { ItemCatalogo } from "./catalogo";

export type Prioridade = "camera" | "bateria" | "desempenho" | "espaco";
export type FormaPagamento = "pix" | "cartao" | "boleto";

export interface Necessidade {
  aparelhoAtual: string;
  faltaNele: string;
  prioridades: Prioridade[];
  /** Quanto pretende investir (total). */
  orcamento: number | null;
  /** Parcela que gostaria de manter. */
  parcelaDesejada: number | null;
  troca: boolean | null;
  pagamento: FormaPagamento | null;
}

export const NECESSIDADE_VAZIA: Necessidade = { aparelhoAtual: "", faltaNele: "", prioridades: [], orcamento: null, parcelaDesejada: null, troca: null, pagamento: null };

export const ROTULO_PRIORIDADE: Record<Prioridade, string> = { camera: "câmera", bateria: "bateria", desempenho: "desempenho", espaco: "espaço" };
export const ROTULO_PAGAMENTO: Record<FormaPagamento, string> = { pix: "Pix", cartao: "cartão", boleto: "boleto" };

export const ETAPAS_ROTEIRO = [
  { id: "entender", titulo: "Entender", fala: "Me conta um pouquinho do que você precisa para eu conseguir te indicar a melhor solução." },
  { id: "indicar", titulo: "Indicar", fala: "Pelo que você me contou, eu te indicaria este aqui, porque atende melhor ao que você procura." },
  { id: "negociar", titulo: "Negociar", fala: "Entre essas duas opções, qual faz mais sentido para você?" },
  { id: "fechar", titulo: "Fechar", fala: "O que está faltando para conseguirmos fechar hoje?" },
] as const;

export const PERGUNTAS_IPHONE = [
  "Qual celular você usa hoje?",
  "O que você mais sente falta nele?",
  "Você prioriza câmera, bateria, desempenho ou espaço?",
  "Tem algum valor que pretende investir ou uma parcela que gostaria de manter?",
  "Você tem algum aparelho para dar na troca?",
  "Pretende pagar no Pix, cartão ou boleto, sujeito às condições disponíveis?",
];

/** As 10 objeções do manual, com a fala recomendada. */
export const OBJECOES = [
  { titulo: "Está caro", fala: "O que ficou fora do que você imaginava: o valor total ou a parcela?" },
  { titulo: "Em outra loja está mais barato", fala: "Você consegue me dizer qual é o modelo, a capacidade, o estado e a condição oferecida? Assim consigo comparar corretamente." },
  { titulo: "Vou pensar", fala: "Claro, sem problema! Ficou alguma dúvida sobre o aparelho, o valor ou as condições?" },
  { titulo: "A parcela ficou alta", fala: "Qual valor de parcela ficaria confortável para você? Vou verificar se existe uma alternativa que se encaixe." },
  { titulo: "Quanto fica à vista?", fala: "Vou confirmar a condição para pagamento à vista e já te passo o valor certinho." },
  { titulo: "Tenho medo de comprar usado", fala: "Vou te explicar o estado deste aparelho, o que foi verificado e qual garantia se aplica a ele." },
  { titulo: "Quero dar meu celular na troca", fala: "Vamos avaliar o seu primeiro e depois calculamos a diferença para o aparelho que você quer." },
  { titulo: "Qual é a garantia?", fala: "Vou te explicar exatamente a garantia deste aparelho ou serviço, o prazo e as condições aplicáveis." },
  { titulo: "Vou procurar outro orçamento", fala: "Vou deixar registrado o orçamento disponível, com o serviço previsto e as condições." },
  { titulo: "Vai demorar muito?", fala: "Vou confirmar o prazo estimado para o seu caso antes de te prometer qualquer data." },
] as const;

export const PERGUNTA_FECHAMENTO = "Me fala uma coisa: o que eu poderia fazer hoje, dentro das condições da loja, para conseguirmos fechar?";
export const PEDIDO_ACOMPANHAMENTO = "Claro! Posso te chamar no WhatsApp para saber se ficou alguma dúvida ou se posso te ajudar com alguma informação?";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function listaNatural(itens: string[]): string {
  if (itens.length <= 1) return itens[0] ?? "";
  return `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;
}

/** "Então, pelo que entendi, você procura…, quer investir… e prioriza…. Acertei?" — só com o que foi respondido. */
export function fraseConfirmacao(n: Necessidade): string | null {
  const partes: string[] = [];
  if (n.faltaNele.trim()) partes.push(`você procura ${n.faltaNele.trim().replace(/[.!?]+$/, "")}`);
  else if (n.aparelhoAtual.trim()) partes.push(`você quer trocar o seu ${n.aparelhoAtual.trim()}`);
  if (n.orcamento) partes.push(`quer investir até ${brl(n.orcamento)}`);
  else if (n.parcelaDesejada) partes.push(`quer manter uma parcela de até ${brl(n.parcelaDesejada)}`);
  if (n.prioridades.length) partes.push(`prioriza ${listaNatural(n.prioridades.map((p) => ROTULO_PRIORIDADE[p]))}`);
  if (partes.length === 0) return null;
  return `Então, pelo que entendi, ${listaNatural(partes)}. Acertei?`;
}

/** Registro interno da necessidade (vai na observação da proposta). */
export function resumoNecessidade(n: Necessidade): string {
  const l: string[] = [];
  if (n.aparelhoAtual.trim()) l.push(`Usa hoje: ${n.aparelhoAtual.trim()}`);
  if (n.faltaNele.trim()) l.push(`Sente falta: ${n.faltaNele.trim()}`);
  if (n.prioridades.length) l.push(`Prioriza: ${n.prioridades.map((p) => ROTULO_PRIORIDADE[p]).join(", ")}`);
  if (n.orcamento) l.push(`Investir até: ${brl(n.orcamento)}`);
  if (n.parcelaDesejada) l.push(`Parcela desejada: ${brl(n.parcelaDesejada)}`);
  if (n.troca !== null) l.push(`Troca: ${n.troca ? "sim" : "não"}`);
  if (n.pagamento) l.push(`Pagamento: ${ROTULO_PAGAMENTO[n.pagamento]}`);
  return l.join(" · ").slice(0, 480);
}

function capacidadeGb(detalhes: string[]): number {
  for (const d of detalhes) {
    const m = d.match(/^(\d+)\s*(GB|TB)$/i);
    if (m) return Number(m[1]) * (m[2].toUpperCase() === "TB" ? 1024 : 1);
  }
  return 0;
}

/**
 * "Uma indicação principal + uma alternativa, se realmente necessário."
 * Principal: o melhor dentro do orçamento (sem ultrapassar), desempatando pela
 * prioridade (espaço → mais GB; bateria → maior saúde). Alternativa: a opção
 * mais barata acima do orçamento até 20% a mais ("caso valha a pena investir um
 * pouco mais"). Sem orçamento informado, não há como indicar com honestidade:
 * devolve vazio para a vendedora perguntar.
 */
export function recomendar(itens: ItemCatalogo[], n: Necessidade, filtro?: (i: ItemCatalogo) => boolean): { principal: ItemCatalogo | null; alternativa: ItemCatalogo | null } {
  const teto = n.orcamento ?? null;
  if (!teto) return { principal: null, alternativa: null };
  const candidatos = itens.filter((i) => i.preco > 0 && (filtro ? filtro(i) : true));
  const pontuar = (i: ItemCatalogo) => {
    let p = i.preco; // dentro do orçamento, mais completo costuma ser o mais caro
    if (n.prioridades.includes("espaco")) p += capacidadeGb(i.detalhes) * 2;
    if (n.prioridades.includes("bateria") && i.bateria != null) p += i.bateria * 10;
    return p;
  };
  const dentro = candidatos.filter((i) => i.preco <= teto).sort((a, b) => pontuar(b) - pontuar(a));
  const acima = candidatos.filter((i) => i.preco > teto && i.preco <= teto * 1.2).sort((a, b) => a.preco - b.preco);
  const principal = dentro[0] ?? null;
  const alternativa = acima[0] ?? null;
  return { principal, alternativa };
}

/** Sequência de acompanhamento do manual (só com autorização do cliente). */
export function mensagensAcompanhamento(nomeCliente: string, vendedora: string | null): { momento: "no_dia" | "24h" | "encerramento"; rotulo: string; texto: string }[] {
  const nome = nomeCliente.trim().split(/\s+/)[0] || "tudo bem";
  const quem = vendedora?.trim().split(/\s+/)[0];
  const apresentacao = quem ? `Aqui é a ${quem}, da Neotec.` : "Aqui é da Neotec.";
  return [
    { momento: "no_dia", rotulo: "No dia", texto: `Oi, ${nome}! ${apresentacao} Foi um prazer te atender hoje. Ficou alguma dúvida sobre a nossa proposta?` },
    { momento: "24h", rotulo: "Em 24 horas", texto: `Oi, ${nome}! Passando para saber se conseguiu avaliar a proposta. Se precisar esclarecer alguma coisa, estou à disposição.` },
    { momento: "encerramento", rotulo: "Encerramento, se não houver resposta", texto: `Obrigado por considerar a Neotec, ${nome}! Quando precisar, estaremos à disposição para te ajudar.` },
  ];
}
