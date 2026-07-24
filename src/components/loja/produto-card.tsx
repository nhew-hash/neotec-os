"use client";

import Link from "next/link";
import { Smartphone, Scale, Check } from "lucide-react";
import { formatCurrency } from "@/utils";
import { labelCategoria, formatarParcelamento } from "./categorias";
import { useComparador, MAX_COMPARACAO_ITENS } from "./comparador-context";
import type { ProdutoLoja } from "@/types";

export function ProdutoCard({ produto }: { produto: ProdutoLoja }) {
  const { idsSelecionados, alternar, estaSelecionado } = useComparador();
  const selecionado = estaSelecionado(produto.id);
  const podeComparar = produto.categoria === "iphone" || produto.categoria === "android";
  const limiteAtingido = !selecionado && idsSelecionados.length >= MAX_COMPARACAO_ITENS;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white transition-all hover:-translate-y-1 hover:shadow-[0_12px_32px_-12px_rgba(16,24,40,0.15)]">
      {podeComparar && (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); alternar(produto.id); }}
          disabled={limiteAtingido}
          title={selecionado ? "Remover da comparação" : "Comparar"}
          className={`absolute right-2.5 top-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border transition-colors ${
            selecionado ? "border-primary bg-primary text-white" : "border-black/[0.08] bg-white/90 text-muted-foreground hover:border-primary/40"
          } disabled:opacity-40`}
        >
          {selecionado ? <Check className="h-3.5 w-3.5" /> : <Scale className="h-3.5 w-3.5" />}
        </button>
      )}

      <Link href={`/loja/produto/${produto.slug}`} className="flex flex-col">
        <div className="flex aspect-square items-center justify-center bg-[#FAFBFC]">
          <Smartphone className="h-16 w-16 text-black/10 transition-transform group-hover:scale-105" strokeWidth={1} />
        </div>
        <div className="flex flex-col gap-1 p-4">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{labelCategoria(produto.categoria)}</span>
          <span className="text-sm font-semibold leading-snug text-foreground">{produto.nome}</span>
          {produto.preco_venda != null && (
            <>
              <span className="mt-1 text-base font-bold text-foreground">{formatCurrency(produto.preco_venda)}</span>
              <span className="text-[11px] text-muted-foreground">{formatarParcelamento(produto.preco_venda)}</span>
            </>
          )}
        </div>
      </Link>
    </div>
  );
}
