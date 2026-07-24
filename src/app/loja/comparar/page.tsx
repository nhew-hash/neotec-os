"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { useComparador } from "@/components/loja/comparador-context";
import { labelCategoria } from "@/components/loja/categorias";
import { formatCurrency } from "@/utils";

const LABEL_CONDICAO: Record<string, string> = { novo: "Novo", seminovo: "Seminovo", usado: "Usado" };

interface ProdutoComparacao {
  id: string; nome: string; categoria: string; marca: string | null; modelo: string | null;
  preco_venda: number | null; slug: string;
  aparelhos: { cor: string | null; memoria: string | null; condicao: string; bateria: number | null; preco_venda: number | null }[];
}

export default function CompararPage() {
  const { idsSelecionados, alternar } = useComparador();
  const [produtos, setProdutos] = useState<ProdutoComparacao[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (idsSelecionados.length === 0) {
      setProdutos([]);
      setCarregando(false);
      return;
    }
    setCarregando(true);
    fetch(`/api/loja/comparar?ids=${idsSelecionados.join(",")}`)
      .then((r) => r.json())
      .then((d) => setProdutos(d.produtos ?? []))
      .finally(() => setCarregando(false));
  }, [idsSelecionados]);

  if (carregando) {
    return <div className="mx-auto max-w-4xl px-4 py-16 text-center text-sm text-muted-foreground">Carregando comparação...</div>;
  }

  if (produtos.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="text-[15px] text-foreground">Nenhum aparelho selecionado pra comparar.</p>
        <Link href="/loja/categoria/iphone" className="mt-4 inline-block rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white">Ver iPhones</Link>
      </div>
    );
  }

  const memoriasPossiveis = Array.from(new Set(produtos.flatMap((p) => p.aparelhos.map((a) => a.memoria).filter(Boolean))));
  const precoMinimo = (p: ProdutoComparacao) => (p.aparelhos.length > 0 ? Math.min(...p.aparelhos.map((a) => a.preco_venda ?? Infinity)) : p.preco_venda);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-8 font-display text-2xl font-semibold text-foreground">Comparar aparelhos</h1>

      <div className="overflow-x-auto">
        <div className="grid min-w-[600px] gap-4" style={{ gridTemplateColumns: `160px repeat(${produtos.length}, 1fr)` }}>
          <div />
          {produtos.map((p) => (
            <div key={p.id} className="flex flex-col items-center gap-2 rounded-2xl border border-black/[0.06] p-4 text-center">
              <button type="button" onClick={() => alternar(p.id)} className="self-end text-muted-foreground hover:text-danger">
                <X className="h-3.5 w-3.5" />
              </button>
              <span className="text-sm font-semibold text-foreground">{p.nome}</span>
              {precoMinimo(p) != null && precoMinimo(p) !== Infinity && (
                <span className="text-base font-bold text-foreground">a partir de {formatCurrency(precoMinimo(p)!)}</span>
              )}
              <Link href={`/loja/produto/${p.slug}`} className="text-xs font-medium text-primary hover:underline">Ver produto</Link>
            </div>
          ))}

          <div className="flex items-center text-xs font-medium uppercase tracking-wide text-muted-foreground">Categoria</div>
          {produtos.map((p) => <div key={p.id} className="flex items-center justify-center text-sm text-foreground">{labelCategoria(p.categoria)}</div>)}

          <div className="flex items-center text-xs font-medium uppercase tracking-wide text-muted-foreground">Marca / Modelo</div>
          {produtos.map((p) => <div key={p.id} className="flex items-center justify-center text-sm text-foreground">{[p.marca, p.modelo].filter(Boolean).join(" ") || "—"}</div>)}

          {memoriasPossiveis.length > 0 && (
            <>
              <div className="flex items-center text-xs font-medium uppercase tracking-wide text-muted-foreground">Armazenamento disponível</div>
              {produtos.map((p) => (
                <div key={p.id} className="flex items-center justify-center text-sm text-foreground">
                  {Array.from(new Set(p.aparelhos.map((a) => a.memoria).filter(Boolean))).join(", ") || "—"}
                </div>
              ))}
            </>
          )}

          <div className="flex items-center text-xs font-medium uppercase tracking-wide text-muted-foreground">Condição</div>
          {produtos.map((p) => (
            <div key={p.id} className="flex items-center justify-center text-sm text-foreground">
              {Array.from(new Set(p.aparelhos.map((a) => LABEL_CONDICAO[a.condicao]))).join(", ") || "—"}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
