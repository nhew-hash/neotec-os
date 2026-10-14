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
  aVista: number;
  opcoes: OpcaoPagamento[];
}

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function calcularProposta(engine: PricingEngine, entrada: EntradaProposta): PropostaCalculada {
  if (entrada.desconto < 0 || entrada.tradeInValor < 0 || entrada.precoTabela < 0) throw new Error("Valores negativos não são permitidos na proposta.");
  if (entrada.desconto > entrada.precoTabela) throw new Error("O desconto não pode ser maior que o preço do item.");
  const base = Math.max(0, r2(entrada.precoTabela - entrada.desconto - entrada.tradeInValor));
  if (base === 0) return { precoTabela: entrada.precoTabela, desconto: entrada.desconto, tradeInValor: entrada.tradeInValor, baseLiquida: 0, aVista: 0, opcoes: [] };
  const r = engine.calcular(base);
  return {
    precoTabela: entrada.precoTabela,
    desconto: entrada.desconto,
    tradeInValor: entrada.tradeInValor,
    baseLiquida: base,
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
