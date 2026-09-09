"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { HeroSlide } from "@/types";

/**
 * Imagem desktop e mobile são campos separados de propósito — cada
 * slide pode ter uma composição diferente pra tela cheia (retrato no
 * celular, paisagem no desktop), não é a mesma imagem redimensionada.
 * Sem imagem cadastrada, cai pro fundo com textura (mesmo tratamento
 * visual que a home já tinha antes do CMS existir) — nesse caso o
 * bloco fica bem mais baixo (py-20, sem forçar aspect-ratio de foto),
 * já que não tem imagem pra preencher o espaço todo.
 *
 * Navegação é só automática (troca sozinha a cada 6s) — sem setas nem
 * pontinhos, pedido explícito pra deixar mais limpo.
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
  const temImagem = Boolean(slide.imagem_desktop_url || slide.imagem_mobile_url);
  const temTextoSobreposto = Boolean(slide.titulo || slide.subtitulo || (slide.texto_botao && slide.link_botao));

  return (
    <section
      className={`relative flex items-center overflow-hidden bg-gradient-to-b from-[#F7F9FC] to-white px-4 text-center ${
        temImagem ? "aspect-[4/5] py-16 sm:aspect-[16/5] sm:py-32" : "py-20"
      }`}
    >
      {temImagem ? (
        <>
          {slide.imagem_desktop_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={slide.imagem_desktop_url} alt="" className="absolute inset-0 hidden h-full w-full object-cover sm:block" />
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={slide.imagem_mobile_url ?? slide.imagem_desktop_url ?? ""} alt="" className="absolute inset-0 h-full w-full object-cover sm:hidden" />
          {temTextoSobreposto && <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/25 to-transparent" />}
        </>
      ) : (
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "radial-gradient(circle, #0B0D12 1px, transparent 1px)", backgroundSize: "28px 28px" }}
        />
      )}

      <div className="relative w-full animate-reveal-up" key={slide.id}>
        {slide.titulo && (
          <h1 className={`mx-auto max-w-3xl font-display text-[2.75rem] font-semibold leading-[1.05] tracking-tight sm:text-7xl ${temImagem ? "text-white" : "text-foreground"}`}>
            {slide.titulo}
          </h1>
        )}
        {slide.subtitulo && (
          <p className={`mx-auto mt-6 max-w-md text-sm leading-relaxed sm:text-lg ${temImagem ? "text-white/80" : "text-muted-foreground"}`}>
            {slide.subtitulo}
          </p>
        )}
        {slide.texto_botao && slide.link_botao && (
          <div className="mt-10 flex items-center justify-center">
            <Button asChild size="xl" pill className="shadow-xl shadow-primary/25 transition-transform hover:-translate-y-0.5 hover:bg-primary">
              <Link href={slide.link_botao}>
                {slide.texto_botao}<ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
