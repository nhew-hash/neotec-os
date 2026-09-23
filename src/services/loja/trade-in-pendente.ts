"use client";

/**
 * Trade-in "pagamento antecipado" escolhido no wizard, guardado no
 * navegador do cliente até ele chegar no checkout — mesmo padrão de
 * localStorage já usado pro carrinho (`carrinho-context.tsx`). Não é
 * estado que precisa sincronizar com o servidor: é só uma lembrança de
 * "essa pessoa quer usar essa avaliação na próxima compra".
 */
export interface TradeInPendente {
  avaliacaoId: string;
  modeloNome: string;
  valorEstimado: number;
}

const CHAVE = "neotec-loja-trade-in-pendente";

export function salvarTradeInPendente(dados: TradeInPendente): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(dados));
  } catch {
    // localStorage indisponível — segue sem travar o fluxo, o cliente
    // ainda pode continuar pelo WhatsApp se precisar.
  }
}

export function lerTradeInPendente(): TradeInPendente | null {
  try {
    const salvo = localStorage.getItem(CHAVE);
    return salvo ? (JSON.parse(salvo) as TradeInPendente) : null;
  } catch {
    return null;
  }
}

export function limparTradeInPendente(): void {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    // idem — não é crítico.
  }
}
