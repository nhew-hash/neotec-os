"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useVistosRecentes } from "./vistos-recentes-context";
import { formatCurrency } from "@/utils";

/** Só registra — não renderiza nada visível. Colocado na página de produto. */
export function RegistrarVisto({ id, nome, slug, preco }: { id: string; nome: string; slug: string; preco: number | null }) {
  const { registrar } = useVistosRecentes();

  useEffect(() => {
    registrar({ id, nome, slug, preco });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return null;
}

/** Mostra a lista — usado na home ou no rodapé da página de produto. Não mostra nada se a lista estiver vazia (sem dado real, sem elemento). */
export function VistosRecentesLista({ excluirId }: { excluirId?: string }) {
  const { itens } = useVistosRecentes();
  const lista = itens.filter((i) => i.id !== excluirId);

  if (lista.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10">
      <h2 className="mb-4 font-display text-lg font-semibold text-foreground">Vistos recentemente</h2>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {lista.map((item) => (
          <Link
            key={item.id}
            href={item.slug ? `/loja/produto/${item.slug}` : "#"}
            className="flex w-40 shrink-0 flex-col gap-1 rounded-xl border border-black/[0.06] p-3 transition-colors hover:border-primary/30"
          >
            <span className="line-clamp-2 text-xs font-medium text-foreground">{item.nome}</span>
            {item.preco != null && <span className="text-xs font-semibold text-foreground">{formatCurrency(item.preco)}</span>}
          </Link>
        ))}
      </div>
    </section>
  );
}
