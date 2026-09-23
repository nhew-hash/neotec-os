/**
 * As 3 formas de comprar usando o aparelho antigo como parte do
 * pagamento — fonte única, usada tanto nas 3 opções mostradas no site
 * (depois da estimativa) quanto no texto que o bot manda pro cliente
 * quando perguntam "como funciona a troca". Mudar a explicação aqui
 * muda nos dois lugares ao mesmo tempo.
 */

export type FormaCompraTroca = "pagamento_antecipado" | "enviar_aparelho" | "presencial";

export interface OpcaoCompraTroca {
  id: FormaCompraTroca;
  emoji: string;
  titulo: string;
  resumo: string;
  descricao: string;
}

export const OPCOES_COMPRA_TROCA: OpcaoCompraTroca[] = [
  {
    id: "pagamento_antecipado",
    emoji: "1️⃣",
    titulo: "Pagamento antecipado + avaliação",
    resumo: "Paga os dois valores agora, um deles é estornado depois",
    descricao:
      "Você faz dois pagamentos: um já com o valor estimado do seu aparelho descontado do iPhone, e outro no valor estimado do seu aparelho. Assim que o aparelho chegar na loja e for avaliado, o valor desse segundo pagamento é estornado — seja Pix ou cartão.",
  },
  {
    id: "enviar_aparelho",
    emoji: "2️⃣",
    titulo: "Enviar o aparelho para avaliação",
    resumo: "Manda o aparelho pra Neotec e paga só a diferença depois",
    descricao:
      "Você envia o aparelho pra Neotec. Assim que ele chega, fazemos a avaliação e informamos o valor de troca. Você paga só a diferença entre o iPhone escolhido e o valor do seu aparelho.",
  },
  {
    id: "presencial",
    emoji: "🏪",
    titulo: "Atendimento presencial",
    resumo: "Vem na loja, avaliamos na hora e você já sai com o iPhone",
    descricao:
      "Você vem até a loja com o aparelho. Fazemos a avaliação na hora, calculamos o valor da troca e você já finaliza a compra do iPhone novo.",
  },
];

/** Texto corrido (formatação WhatsApp) — usado pelo bot e disponível pra qualquer outro canal que precise da versão em texto único. */
export function montarTextoComoFuncionaTroca(): string {
  const linhas = OPCOES_COMPRA_TROCA.map((op) => `${op.emoji} *${op.titulo}*\n${op.descricao}`);
  return `📱 *Como funciona a troca do seu aparelho por um iPhone na Neotec*\n\nVocê pode usar seu aparelho atual como parte do pagamento, de 3 formas:\n\n${linhas.join("\n\n")}\n\n🍎 Neotec — seu próximo iPhone começa aqui.`;
}
