import type { PricingEngine } from "@/services/precificacao/pricing-engine";

/**
 * Proposta comercial (à vista e parcelada) a partir do MOTOR ÚNICO de preços
 * (PricingEngine). Esta função só decide a base de cálculo; não tem taxa nem
 * regra de juros própria. Nada de custo, margem ou recebimento líquido sai daqui:
 * o que a vendedora vê é só o que o cliente vê.
 */
export interface EntradaProposta {
  precoTabela: number; // preço cadastrado do item (mesma semântica da loja: o líquido que a loja quer receber)
  desconto: number;
  tradeInValor: number;
}

export interface OpcaoPagamento {
  parcelas: number;
  valorParcela: number;
  valorTotal: number;
  comJuros: boolean;
}

export interface PropostaCalculada {
  precoTabela: number;
  desconto: number;
  tradeInValor: number;
  baseLiquida: number;
  /** Primeiro valor falado ao cliente: preço cheio já abatido de troca/desconto, SEM a condição de Pix. Com troca, é a "volta". */
  valorCheio: number;
  aVista: number;
  opcoes: OpcaoPagamento[];
}

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function calcularProposta(engine: PricingEngine, entrada: EntradaProposta): PropostaCalculada {
  if (entrada.desconto < 0 || entrada.tradeInValor < 0 || entrada.precoTabela < 0) throw new Error("Valores negativos não são permitidos na proposta.");
  if (entrada.desconto > entrada.precoTabela) throw new Error("O desconto não pode ser maior que o preço do item.");
  const base = Math.max(0, r2(entrada.precoTabela - entrada.desconto - entrada.tradeInValor));
  if (base === 0) return { precoTabela: entrada.precoTabela, desconto: entrada.desconto, tradeInValor: entrada.tradeInValor, baseLiquida: 0, valorCheio: 0, aVista: 0, opcoes: [] };
  const r = engine.calcular(base);
  return {
    precoTabela: entrada.precoTabela,
    desconto: entrada.desconto,
    tradeInValor: entrada.tradeInValor,
    baseLiquida: base,
    valorCheio: r2(r.precoVitrine),
    aVista: r2(r.precoPix),
    opcoes: r.parcelas.map((p) => ({ parcelas: p.numero, valorParcela: r2(p.valorParcela), valorTotal: r2(p.valorTotal), comJuros: p.temJuros })),
  };
}

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Texto pronto para colar no WhatsApp. Só usa valores calculados acima. */
export function textoDaProposta(params: { descricao: string; proposta: PropostaCalculada; validadeAte?: string | null; nomeCliente?: string | null }): string {
  const { descricao, proposta: p, validadeAte, nomeCliente } = params;
  const linhas: string[] = [];
  linhas.push(`${nomeCliente ? `Olá, ${nomeCliente.split(" ")[0]}! ` : ""}Segue a proposta da Neotec:`);
  linhas.push(`📱 ${descricao}`);
  linhas.push(`Preço: ${brl(p.precoTabela)}`);
  if (p.desconto > 0) linhas.push(`Desconto: -${brl(p.desconto)}`);
  if (p.tradeInValor > 0) linhas.push(`Seu aparelho na troca: -${brl(p.tradeInValor)}`);
  linhas.push(`✅ À vista (Pix): ${brl(p.aVista)}`);
  const parcelasMostradas = p.opcoes.filter((o) => [3, 6, 10, 12].includes(o.parcelas));
  for (const o of parcelasMostradas) linhas.push(`💳 ${o.parcelas}x de ${brl(o.valorParcela)}${o.comJuros ? "" : " sem juros"} (total ${brl(o.valorTotal)})`);
  if (validadeAte) linhas.push(`Válida até ${new Date(validadeAte).toLocaleDateString("pt-BR")}.`);
  return linhas.join("\n");
}

// ---------------------------------------------------------------------------
// Proposta com vários itens + mensagem comercial
// ---------------------------------------------------------------------------

export interface LinhaProposta {
  descricao: string;
  quantidade: number;
  precoUnitario: number;
}

export function totalDasLinhas(linhas: LinhaProposta[]): number {
  return r2(linhas.reduce((acc, l) => acc + l.precoUnitario * l.quantidade, 0));
}

/**
 * Quais parcelas aparecem na mensagem: a maior SEM juros (se houver mais de 1x), 6x, 10x e 12x, só entre as que
 * o motor realmente calculou. Nunca cria opção que não existe.
 */
export function escolherParcelasParaMensagem(opcoes: OpcaoPagamento[]): OpcaoPagamento[] {
  const disponiveis = opcoes.filter((o) => o.parcelas > 1);
  const semJuros = disponiveis.filter((o) => !o.comJuros);
  const alvo = new Set<number>([6, 10, 12]);
  if (semJuros.length > 0) alvo.add(Math.max(...semJuros.map((o) => o.parcelas)));
  return disponiveis.filter((o) => alvo.has(o.parcelas)).sort((a, b) => a.parcelas - b.parcelas).slice(0, 4);
}

/** Sem nenhuma parcela calculada = a tabela de taxas não está configurada (ou está vazia). A tela precisa dizer isso. */
export function parcelamentoDisponivel(proposta: PropostaCalculada): boolean {
  return proposta.baseLiquida === 0 || proposta.opcoes.some((o) => o.parcelas > 1);
}

export type ModoAtendimento = "whatsapp" | "presencial";

/**
 * Mensagem comercial para revisão e edição. Só usa valores calculados; não promete reserva, garantia
 * nem "sem juros" que o motor não tenha confirmado, e deixa explícito que a disponibilidade vale até o fechamento.
 */
export function mensagemComercial(params: { linhas: LinhaProposta[]; proposta: PropostaCalculada; nomeCliente?: string | null; vendedor?: string | null; validadeAte?: string | null; modo: ModoAtendimento; incluirAVista?: boolean }): string {
  const { linhas, proposta: p, nomeCliente, vendedor, validadeAte, modo, incluirAVista = false } = params;
  const primeiro = nomeCliente?.trim().split(/\s+/)[0];
  const out: string[] = [];
  out.push(modo === "whatsapp" ? `Olá${primeiro ? `, ${primeiro}` : ""}! Segue a proposta da Neotec 👇` : `Proposta Neotec${primeiro ? ` para ${primeiro}` : ""}:`);
  out.push("");
  for (const l of linhas) out.push(`📱 ${l.quantidade > 1 ? `${l.quantidade}x ` : ""}${l.descricao}`);
  out.push("");
  // Técnica de venda: primeiro o valor cheio (sem desconto, sem Pix). Com troca, fala só a "volta", sem expor o valor da troca.
  if (p.tradeInValor > 0) out.push(p.valorCheio > 0 ? `🔄 Com a troca do seu aparelho, a volta fica em *${brl(p.valorCheio)}*` : "🔄 Com a troca do seu aparelho, não há volta a pagar");
  else out.push(`💰 Valor: *${brl(p.valorCheio)}*`);
  for (const o of escolherParcelasParaMensagem(p.opcoes)) {
    out.push(`💳 ${o.parcelas}x de ${brl(o.valorParcela)}${o.comJuros ? "" : " sem juros"} (total ${brl(o.valorTotal)})`);
  }
  if (incluirAVista && p.aVista > 0) out.push(`✅ À vista (Pix): *${brl(p.aVista)}*`);
  out.push("");
  if (validadeAte) out.push(`Proposta válida até ${new Date(validadeAte + "T12:00:00").toLocaleDateString("pt-BR")}. Disponibilidade confirmada no fechamento.`);
  else out.push("Valores e disponibilidade confirmados no fechamento.");
  out.push(modo === "whatsapp" ? "Se fizer sentido para você, me avise por aqui que eu continuo o atendimento." : "Qualquer dúvida, é só perguntar!");
  if (vendedor) out.push(`— ${vendedor.split(/\s+/)[0]}, Neotec`);
  return out.join("\n");
}

/**
 * Reparte o valor FINAL da proposta entre as linhas, proporcional ao preço de tabela, para que a soma dos
 * itens do orçamento bata exatamente com o que o cliente pagará (+ troca). O resíduo de centavos vai para
 * a última linha de quantidade 1 (ou para a última linha, se não houver).
 */
export function distribuirValor(linhas: LinhaProposta[], totalFinal: number): number[] {
  const tabela = totalDasLinhas(linhas);
  if (linhas.length === 0) return [];
  if (tabela === 0) return linhas.map(() => 0);
  const fator = totalFinal / tabela;
  const unitarios = linhas.map((l) => r2(l.precoUnitario * fator));
  const soma = r2(unitarios.reduce((acc, v, i) => acc + v * linhas[i].quantidade, 0));
  const residuo = r2(totalFinal - soma);
  if (residuo !== 0) {
    let alvo = -1;
    for (let i = linhas.length - 1; i >= 0; i--) if (linhas[i].quantidade === 1) { alvo = i; break; }
    if (alvo === -1) alvo = linhas.length - 1;
    unitarios[alvo] = r2(unitarios[alvo] + residuo / linhas[alvo].quantidade);
  }
  return unitarios;
}
