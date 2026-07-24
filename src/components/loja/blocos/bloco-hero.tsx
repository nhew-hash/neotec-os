"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import type { HeroSlide } from "@/types";

/**
 * Imagem desktop e mobile são campos separados de propósito — cada
 * slide pode ter uma composição diferente pra tela cheia (retrato no
 * celular, paisagem no desktop), não é a mesma imagem redimensionada.
 * Sem imagem cadastrada, cai pro fundo com textura (mesmo tratamento
 * visual que a home já tinha antes do CMS existir).
 */
export function BlocoHero({ slides }: { slides: HeroSlide[] }) {
  const [indiceAtual, setIndiceAtual] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = setInterval(() => setIndiceAtual((i) => (i + 1) % slides.length), 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (slides.length === 0) return null;
  const slide = slides[indiceAtual];

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#F7F9FC] to-white px-4 py-24 text-center sm:py-32">
      {(slide.imagem_desktop_url || slide.imagem_mobile_url) ? (
        <>
          {slide.imagem_desktop_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={slide.imagem_desktop_url} alt="" className="absolute inset-0 hidden h-full w-full object-cover sm:block" />
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={slide.imagem_mobile_url ?? slide.imagem_desktop_url ?? ""} alt="" className="absolute inset-0 h-full w-full object-cover sm:hidden" />
          <div className="absolute inset-0 bg-black/35" />
        </>
      ) : (
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "radial-gradient(circle, #0B0D12 1px, transparent 1px)", backgroundSize: "28px 28px" }}
        />
      )}

      <div className="relative animate-reveal-up" key={slide.id}>
        <h1 className={`mx-auto max-w-3xl font-display text-[2.75rem] font-semibold leading-[1.05] tracking-tight sm:text-7xl ${slide.imagem_desktop_url || slide.imagem_mobile_url ? "text-white" : "text-foreground"}`}>
          {slide.titulo}
        </h1>
        {slide.subtitulo && (
          <p className={`mx-auto mt-6 max-w-md text-[15px] leading-relaxed sm:text-lg ${slide.imagem_desktop_url || slide.imagem_mobile_url ? "text-white/80" : "text-muted-foreground"}`}>
            {slide.subtitulo}
          </p>
        )}
        {slide.texto_botao && slide.link_botao && (
          <div className="mt-10 flex items-center justify-center">
            <Link
              href={slide.link_botao}
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-9 py-4 text-sm font-semibold text-white shadow-xl shadow-primary/25 transition-transform hover:-translate-y-0.5"
            >
              {slide.texto_botao}<ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </div>

      {slides.length > 1 && (
        <>
          <button type="button" onClick={() => setIndiceAtual((i) => (i - 1 + slides.length) % slides.length)} className="absolute left-4 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 backdrop-blur hover:bg-white">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setIndiceAtual((i) => (i + 1) % slides.length)} className="absolute right-4 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 backdrop-blur hover:bg-white">
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="relative mt-8 flex items-center justify-center gap-1.5">
            {slides.map((s, i) => (
              <button key={s.id} type="button" onClick={() => setIndiceAtual(i)} className={`h-1.5 rounded-full transition-all ${i === indiceAtual ? "w-6 bg-primary" : "w-1.5 bg-black/15"}`} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
