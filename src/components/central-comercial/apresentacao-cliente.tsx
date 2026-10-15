"use client";

import { useEffect, useRef } from "react";
import { Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ResultadoComposicao } from "@/services/central-comercial/propostas.service";
import { formatCurrency } from "@/utils/format";

/**
 * Tela para mostrar ao cliente na loja. Só recebe o que o cliente pode ver: itens, valores e parcelas.
 * NÃO recebe custo, margem, limites de desconto nem observações internas — nem como prop.
 */
export type DadosApresentacao = Pick<ResultadoComposicao, "linhas" | "proposta"> & { nomeCliente: string | null; validadeAte?: string | null; mostrarAVista?: boolean };

export function ApresentacaoCliente({ dados, onFechar }: { dados: DadosApresentacao; onFechar: () => void }) {
  const fechar = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    fechar.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onFechar(); };
    window.addEventListener("keydown", esc);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", esc); document.body.style.overflow = overflow; };
  }, [onFechar]);

  const { proposta: p, linhas } = dados;
  const primeiro = dados.nomeCliente?.trim().split(/\s+/)[0];
  const opcoes = p.opcoes.filter((o) => o.parcelas > 1);
  // Com um único item e sem desconto/troca, o preço do item é o líquido da loja e destoaria do Pix mostrado logo abaixo: só o Pix e as parcelas valem.
  const mostrarPrecoDosItens = linhas.length > 1 && p.desconto === 0 && p.tradeInValor === 0;
  const comTroca = p.tradeInValor > 0;

  return (
    <div role="dialog" aria-modal="true" aria-label="Proposta para o cliente" className="fixed inset-0 z-[60] overflow-y-auto bg-white text-slate-900">
      <style>{`@media print { body * { visibility: hidden; } #apresentacao, #apresentacao * { visibility: visible; } #apresentacao { position: absolute; inset: 0; } .nao-imprimir { display: none !important; } }`}</style>
      <div className="nao-imprimir sticky top-0 z-10 flex items-center justify-end gap-2 border-b border-slate-200 bg-white/95 px-4 py-2 backdrop-blur">
        <Button type="button" variant="outline" size="sm" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" aria-hidden />Imprimir</Button>
        <Button ref={fechar} type="button" size="sm" onClick={onFechar}><X className="mr-2 h-4 w-4" aria-hidden />Fechar</Button>
      </div>
      <div id="apresentacao" className="mx-auto max-w-2xl px-6 py-10 sm:py-14">
        <p className="font-display text-lg font-semibold tracking-tight text-primary">Neotec</p>
        <h2 className="mt-6 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{primeiro ? `Proposta para ${primeiro}` : "Sua proposta"}</h2>

        <ul className="mt-8 divide-y divide-slate-200 border-y border-slate-200">
          {linhas.map((l) => (
            <li key={`${l.tipo}:${l.id}`} className="flex items-baseline justify-between gap-4 py-4">
              <span className="text-base font-medium">{l.quantidade > 1 ? `${l.quantidade}x ` : ""}{l.descricao}</span>
              {mostrarPrecoDosItens && <span className="whitespace-nowrap tabular-nums text-slate-600">{formatCurrency(l.precoUnitario * l.quantidade)}</span>}
            </li>
          ))}
        </ul>

        {/* Técnica de venda: primeiro o valor cheio (ou só a volta, com troca). O Pix é o segundo passo, liberado pela vendedora. */}
        <div className="mt-8 rounded-2xl bg-slate-50 p-6">
          <p className="text-sm text-slate-600">{comTroca ? "A volta, com a troca do seu aparelho" : "Valor"}</p>
          <p className="mt-1 font-display text-5xl font-semibold tabular-nums tracking-tight">{p.valorCheio > 0 ? formatCurrency(p.valorCheio) : "Sem volta a pagar"}</p>
        </div>

        {opcoes.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-medium text-slate-600">Parcelado no cartão</h3>
            <table className="mt-2 w-full text-left text-base">
              <thead className="sr-only"><tr><th>Parcelas</th><th>Valor da parcela</th><th>Total</th></tr></thead>
              <tbody className="divide-y divide-slate-200">
                {opcoes.map((o) => (
                  <tr key={o.parcelas}>
                    <td className="py-2.5 font-medium">{o.parcelas}x {!o.comJuros && <span className="ml-1 text-sm font-normal text-emerald-700">sem juros</span>}</td>
                    <td className="py-2.5 tabular-nums">{formatCurrency(o.valorParcela)}</td>
                    <td className="py-2.5 text-right tabular-nums text-slate-500">{formatCurrency(o.valorTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {dados.mostrarAVista && p.aVista > 0 && (
          <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
            <p className="text-sm text-emerald-800">À vista no Pix</p>
            <p className="mt-1 font-display text-4xl font-semibold tabular-nums tracking-tight text-emerald-950">{formatCurrency(p.aVista)}</p>
          </div>
        )}

        <p className="mt-10 text-xs text-slate-500">
          {dados.validadeAte ? `Proposta válida até ${new Date(`${dados.validadeAte}T12:00:00`).toLocaleDateString("pt-BR")}. ` : ""}Valores e disponibilidade confirmados no fechamento.
        </p>
      </div>
    </div>
  );
}
