"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Smartphone } from "lucide-react";
import { slugify } from "@/services/lacrados/slugify";
import { formatCurrency } from "@/utils";
import type { CatalogoLacradoModelo } from "@/types";

type Modelo = Pick<CatalogoLacradoModelo, "id" | "nome" | "marca" | "fotos"> & { preco_a_partir_de: number | null };

export function LacradosListaCliente({ modelos }: { modelos: Modelo[] }) {
  const ehApple = (m: Modelo) => m.marca?.toLowerCase() === "apple";
  const totalApple = modelos.filter(ehApple).length;
  const totalAndroid = modelos.length - totalApple;

  const [aba, setAba] = useState<"todos" | "apple" | "android">("todos");
  const modelosFiltrados = useMemo(() => {
    if (aba === "apple") return modelos.filter(ehApple);
    if (aba === "android") return modelos.filter((m) => !ehApple(m));
    return modelos;
  }, [modelos, aba]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="mb-1 font-display text-2xl font-semibold text-foreground">Lacrados</h1>
      <p className="mb-6 text-sm text-muted-foreground">Aparelhos novos, lacrados de fábrica, com nota fiscal e garantia.</p>

      {totalApple > 0 && totalAndroid > 0 && (
        <div className="mb-6 flex gap-2">
          <button type="button" onClick={() => setAba("todos")} className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${aba === "todos" ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
            Todos ({modelos.length})
          </button>
          <button type="button" onClick={() => setAba("apple")} className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${aba === "apple" ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
            iPhone ({totalApple})
          </button>
          <button type="button" onClick={() => setAba("android")} className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${aba === "android" ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
            Android ({totalAndroid})
          </button>
        </div>
      )}

      {modelosFiltrados.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Nenhum modelo disponível no momento — confere com a gente pelo WhatsApp.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {modelosFiltrados.map((m) => (
            <Link
              key={m.id}
              href={`/loja/lacrados/${slugify(m.nome)}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white transition-all hover:-translate-y-1 hover:shadow-[0_12px_32px_-12px_rgba(16,24,40,0.15)]"
            >
              <div className="flex aspect-square items-center justify-center overflow-hidden bg-white">
                {m.fotos?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.fotos[0]} alt={m.nome} className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <Smartphone className="h-16 w-16 text-black/[0.08] transition-transform duration-500 group-hover:scale-110" strokeWidth={1} />
                )}
              </div>
              <div className="flex flex-col gap-1 p-4">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Lacrado</span>
                <span className="text-sm font-semibold text-foreground">{m.nome}</span>
                {m.preco_a_partir_de != null && (
                  <span className="text-xs text-success">A partir de {formatCurrency(m.preco_a_partir_de)}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
