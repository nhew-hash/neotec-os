import Link from "next/link";
import {
  ShieldCheck, Wallet, Repeat, Wrench, Star, ArrowRight, Instagram,
  PackageCheck, Smartphone, TabletSmartphone, Tablet, Laptop, Watch, Headphones, SprayCan, Cable, Zap,
} from "lucide-react";
import { CATEGORIAS_LOJA, hrefCategoria } from "@/components/loja/categorias";
import { Button } from "@/components/ui/button";
import type { HomeSecao } from "@/types";

const ICONES: Record<string, typeof ShieldCheck> = { "shield-check": ShieldCheck, wallet: Wallet, repeat: Repeat, wrench: Wrench };

interface ItemLista { titulo: string; descricao: string; nota?: string }

export function BlocoBanner({ secao }: { secao: HomeSecao }) {
  const c = secao.configuracao as { titulo?: string; subtitulo?: string; link?: string; texto_botao?: string };
  if (!c.titulo) return null;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-14">
      <div className="flex flex-col items-center gap-4 rounded-3xl bg-card px-8 py-14 text-center">
        <h3 className="font-display text-section-title text-foreground">{c.titulo}</h3>
        {c.subtitulo && <p className="max-w-md text-sm text-muted-foreground">{c.subtitulo}</p>}
        {c.link && c.texto_botao && (
          <Button asChild size="lg" pill className="mt-2 hover:bg-primary">
            <Link href={c.link}>{c.texto_botao}</Link>
          </Button>
        )}
      </div>
    </section>
  );
}

const ICONE_CATEGORIA: Record<string, typeof ShieldCheck> = {
  iphone_lacrado: PackageCheck, iphone: Smartphone, android_tablet: TabletSmartphone, ipad: Tablet, mac: Laptop,
  apple_watch: Watch, audio: Headphones, perfume: SprayCan, acessorio: Cable, eletronicos_mobilidade: Zap,
};

/**
 * Antes: 10 blocos grandes com emoji (✨📱🤖) — no celular ocupavam duas
 * telas inteiras antes do primeiro produto e destoavam do visual da loja.
 * Agora: faixa compacta com ícone de linha (rola de lado no celular).
 */
export function BlocoCategorias() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-4 pt-8 sm:pt-12">
      <h2 className="sr-only">Categorias</h2>
      <div className="neotec-scroll-x -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-5 sm:gap-3 sm:overflow-visible sm:px-0 lg:grid-cols-10">
        {CATEGORIAS_LOJA.map((c) => {
          const Icone = ICONE_CATEGORIA[c.valor] ?? Smartphone;
          return (
            <Link
              key={c.valor}
              href={hrefCategoria(c.valor)}
              className="group flex w-[88px] shrink-0 flex-col items-center gap-2 rounded-2xl px-1 py-3 text-center transition-colors hover:bg-secondary sm:w-auto"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F5F5F7] text-foreground transition-all group-hover:bg-primary group-hover:text-white">
                <Icone className="h-6 w-6" strokeWidth={1.5} />
              </span>
              <span className="line-clamp-2 text-[11px] font-medium leading-tight text-foreground sm:text-xs">{c.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function BlocoTradeIn({ secao }: { secao: HomeSecao }) {
  const c = secao.configuracao as { titulo?: string; descricao?: string; texto_botao?: string };

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-24">
      <div className="flex flex-col items-center gap-5 rounded-[2rem] bg-gradient-to-br from-sidebar to-sidebar-active px-8 py-16 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <h3 className="font-display text-3xl font-semibold tracking-tight text-white">{c.titulo ?? "Seu aparelho atual pode valer mais do que você imagina"}</h3>
          {c.descricao && <p className="mt-3 max-w-md text-sm text-white/55">{c.descricao}</p>}
        </div>
        <Button asChild size="lg" pill className="shrink-0 bg-white text-[#0B0D12] transition-transform hover:-translate-y-0.5 hover:bg-white">
          <Link href="/loja/trade-in">{c.texto_botao ?? "Avaliar meu aparelho"}</Link>
        </Button>
      </div>
    </section>
  );
}

/**
 * Antes: bloco preto de ~650px no celular. Agora: faixa clara e compacta —
 * os mesmos 4 argumentos (vêm do CMS), sem empurrar os produtos pra baixo.
 */
export function BlocoAssistencia({ secao }: { secao: HomeSecao }) {
  const c = secao.configuracao as { itens?: (ItemLista & { icone?: string })[] };
  const itens = c.itens ?? [];
  if (itens.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {itens.map((item, i) => {
          const Icone = ICONES[item.icone ?? ""] ?? ShieldCheck;
          return (
            <div key={i} className="flex items-start gap-3 rounded-2xl bg-[#F5F5F7] p-4">
              <Icone className="mt-0.5 h-5 w-5 shrink-0 text-primary" strokeWidth={1.75} />
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-snug text-foreground">{item.titulo}</p>
                <p className="mt-1 hidden text-xs leading-relaxed text-muted-foreground sm:block">{item.descricao}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function BlocoAvaliacoes({ secao }: { secao: HomeSecao }) {
  const c = secao.configuracao as { titulo?: string; itens?: ItemLista[] };
  const itens = c.itens ?? [];
  if (itens.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16">
      <h2 className="mb-8 font-display text-section-title tracking-tight text-foreground">{c.titulo ?? "O que dizem nossos clientes"}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {itens.map((item, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-2xl border border-border p-5">
            <div className="flex gap-0.5 text-warning">
              {Array.from({ length: Number(item.nota) || 5 }).map((_, j) => <Star key={j} className="h-3.5 w-3.5 fill-current" />)}
            </div>
            <p className="text-sm text-foreground">{item.descricao}</p>
            <span className="text-xs font-medium text-muted-foreground">{item.titulo}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function BlocoVideo({ secao }: { secao: HomeSecao }) {
  const c = secao.configuracao as { titulo?: string; url_video?: string };
  if (!c.url_video) return null;

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-16">
      {c.titulo && <h2 className="mb-6 font-display text-section-title tracking-tight text-foreground">{c.titulo}</h2>}
      <div className="aspect-video overflow-hidden rounded-2xl">
        <iframe src={c.url_video} className="h-full w-full" allowFullScreen title={c.titulo ?? "Vídeo"} />
      </div>
    </section>
  );
}

export function BlocoInstagram({ secao }: { secao: HomeSecao }) {
  const c = secao.configuracao as { titulo?: string; handle?: string; link?: string };
  if (!c.handle) return null;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 text-center">
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-border p-8">
        <Instagram className="h-6 w-6 text-primary" />
        <h3 className="font-display text-lg font-semibold text-foreground">{c.titulo ?? "Segue a gente no Instagram"}</h3>
        {c.link ? (
          <Link href={c.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            {c.handle}<ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <span className="text-sm text-muted-foreground">{c.handle}</span>
        )}
      </div>
    </section>
  );
}

export function BlocoTexto({ secao }: { secao: HomeSecao }) {
  const c = secao.configuracao as { titulo?: string; corpo?: string };
  if (!c.corpo) return null;

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-16">
      {c.titulo && <h2 className="mb-4 font-display text-section-title tracking-tight text-foreground">{c.titulo}</h2>}
      <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{c.corpo}</p>
    </section>
  );
}
