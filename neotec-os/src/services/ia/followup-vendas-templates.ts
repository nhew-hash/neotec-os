/**
 * Templates-base da sequência de recuperação de venda (D+0/D+1/D+3/D+5) —
 * definidos pelo dono do produto. A IA personaliza em cima disso (nome
 * do cliente, produto de interesse), mas a ESTRUTURA e o TOM vêm daqui,
 * não são inventados a cada disparo. Se a IA falhar ao personalizar, o
 * fallback usa o template puro com substituição simples — o follow-up
 * SEMPRE sai, mesmo se a IA estiver fora do ar (isso roda sem ninguém
 * revisando, precisa ser resiliente).
 */
export interface EstagioFollowup {
  numero: 1 | 2 | 3 | 4;
  nome: string;
  horasMinimas: number;
  template: string;
  ehFinal: boolean;
}

export const ESTAGIOS_FOLLOWUP: EstagioFollowup[] = [
  {
    numero: 1,
    nome: "D+0",
    horasMinimas: 3,
    template: "Oi {nome} 😊 conseguiu ver as opções que te mandei? Se precisar posso te ajudar a escolher o melhor modelo.",
    ehFinal: false,
  },
  {
    numero: 2,
    nome: "D+1",
    horasMinimas: 24,
    template: "{nome}, tudo bem? Passando para saber se ainda está procurando aquele {produto} 📱 Tenho algumas opções que podem combinar com o que você procura.",
    ehFinal: false,
  },
  {
    numero: 3,
    nome: "D+3",
    horasMinimas: 72,
    template: "{nome}, ainda consigo te ajudar com aquele aparelho. Quer que eu veja alguma outra opção ou condição para você?",
    ehFinal: false,
  },
  {
    numero: 4,
    nome: "D+5",
    horasMinimas: 120,
    template: "{nome}, vou deixar seu atendimento em aberto por aqui 😊 Quando quiser finalizar sua compra, é só me chamar. A Neotec está à disposição.",
    ehFinal: true,
  },
];

export function preencherTemplate(template: string, nome: string, produto: string): string {
  return template.replace("{nome}", nome).replace("{produto}", produto || "aparelho");
}
