import Link from "next/link";
import { Smartphone } from "lucide-react";
import { formatCurrency } from "@/utils";
import { labelCategoria } from "./categorias";
import type { ProdutoLoja } from "@/types";

export function ProdutoCard({ produto }: { produto: ProdutoLoja }) {
  return (
    <Link
      href={`/loja/produto/${produto.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white transition-all hover:-translate-y-1 hover:shadow-[0_12px_32px_-12px_rgba(16,24,40,0.15)]"
    >
      <div className="flex aspect-square items-center justify-center bg-[#FAFBFC]">
        <Smartphone className="h-16 w-16 text-black/10 transition-transform group-hover:scale-105" strokeWidth={1} />
      </div>
      <div className="flex flex-col gap-1 p-4">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{labelCategoria(produto.categoria)}</span>
        <span className="text-sm font-semibold leading-snug text-foreground">{produto.nome}</span>
        {produto.preco_venda != null && (
          <span className="mt-1 text-base font-bold text-foreground">
            {formatCurrency(produto.preco_venda)}
          </span>
        )}
      </div>
    </Link>
  );
}
