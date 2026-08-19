"use client";

import Link from "next/link";
import { Smartphone } from "lucide-react";
import { slugify } from "@/services/lacrados/slugify";
import { formatCurrency } from "@/utils";
import type { CatalogoLacradoModelo } from "@/types";

type Modelo = Pick<CatalogoLacradoModelo, "id" | "nome" | "marca" | "fotos"> & { preco_a_partir_de: number | null };

/** Reutilizado nas duas áreas separadas — /loja/lacrados (Apple) e /loja/android (Android) — cada uma já recebe só os modelos da marca certa, sem misturar numa aba só. */
export function LacradosListaCliente({
  modelos, titulo, descricao,
}: {
  modelos: Modelo[];
  titulo: string;
  descricao: string;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="mb-1 font-display text-section-title text-foreground">{titulo}</h1>
      <p className="mb-6 text-sm text-muted-foreground">{descricao}</p>

      {modelos.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Nenhum modelo disponível no momento — confere com a gente pelo WhatsApp.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {modelos.map((m) => (
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
