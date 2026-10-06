"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Galeria da página do produto: imagem grande + miniaturas. A primeira imagem carrega com prioridade (é o LCP da página). */
export function GaleriaProduto({ imagens, alt }: { imagens: string[]; alt: string }) {
  const [atual, setAtual] = useState(0);
  const total = imagens.length;

  if (total === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-3xl bg-white text-achados-muted ring-1 ring-achados-line" role="img" aria-label="Produto sem foto">
        <ImageIcon className="h-14 w-14" aria-hidden />
      </div>
    );
  }

  const ir = (delta: number) => setAtual((i) => (i + delta + total) % total);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-3xl bg-white ring-1 ring-achados-line">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={imagens[atual]}
          src={imagens[atual]}
          alt={total > 1 ? `${alt} (foto ${atual + 1} de ${total})` : alt}
          width={800}
          height={800}
          loading={atual === 0 ? "eager" : "lazy"}
          fetchPriority={atual === 0 ? "high" : "auto"}
          decoding="async"
          className="h-full w-full object-contain p-5 sm:p-8"
        />
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={() => ir(-1)}
              aria-label="Foto anterior"
              className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-achados-navy shadow ring-1 ring-achados-line hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => ir(1)}
              aria-label="Próxima foto"
              className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-achados-navy shadow ring-1 ring-achados-line hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </>
        )}
      </div>

      {total > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Fotos do produto">
          {imagens.map((src, i) => (
            <li key={src} className="shrink-0">
              <button
                type="button"
                onClick={() => setAtual(i)}
                aria-label={`Ver foto ${i + 1}`}
                aria-current={i === atual}
                className={cn(
                  "h-16 w-16 overflow-hidden rounded-xl bg-white p-1 ring-1 transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:h-20 sm:w-20",
                  i === atual ? "ring-2 ring-achados-navy" : "ring-achados-line hover:ring-achados-navy/40"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" width={80} height={80} loading="lazy" decoding="async" className="h-full w-full object-contain" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
