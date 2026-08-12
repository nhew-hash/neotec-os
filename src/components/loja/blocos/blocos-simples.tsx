import Link from "next/link";
import { ShieldCheck, Wallet, Repeat, Wrench, Star, ArrowRight, Instagram } from "lucide-react";
import { CATEGORIAS_LOJA } from "@/components/loja/categorias";
import type { HomeSecao } from "@/types";

const ICONES: Record<string, typeof ShieldCheck> = { "shield-check": ShieldCheck, wallet: Wallet, repeat: Repeat, wrench: Wrench };

interface ItemLista { titulo: string; descricao: string; nota?: string }

export function BlocoBanner({ secao }: { secao: HomeSecao }) {
  const c = secao.configuracao as { titulo?: string; subtitulo?: string; link?: string; texto_botao?: string };
  if (!c.titulo) return null;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-14">
      <div className="flex flex-col items-center gap-4 rounded-3xl bg-[#FAFBFC] px-8 py-14 text-center">
        <h3 className="font-display text-2xl font-semibold text-foreground">{c.titulo}</h3>
        {c.subtitulo && <p className="max-w-md text-sm text-muted-foreground">{c.subtitulo}</p>}
        {c.link && c.texto_botao && (
          <Link href={c.link} className="mt-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-white">{c.texto_botao}</Link>
        )}
      </div>
    </section>
  );
}

export function BlocoCategorias() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Link
          href="/loja/lacrados"
          className="animate-reveal-up flex flex-col items-center gap-2.5 rounded-2xl border border-black/[0.06] bg-[#FAFBFC] py-9 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5 hover:shadow-md"
        >
          <span className="text-3xl">✨</span>
          <span className="text-sm font-medium text-foreground">iPhone Lacrado</span>
        </Link>
        {CATEGORIAS_LOJA.map((c, i) => (
          <Link
            key={c.valor}
            href={`/loja/categoria/${c.valor}`}
            style={{ animationDelay: `${(i + 1) * 60}ms` }}
            className="animate-reveal-up flex flex-col items-center gap-2.5 rounded-2xl border border-black/[0.06] bg-[#FAFBFC] py-9 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5 hover:shadow-md"
          >
            <span className="text-3xl">{c.emoji}</span>
            <span className="text-sm font-medium text-foreground">{c.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function BlocoTradeIn({ secao }: { secao: HomeSecao }) {
  const c = secao.configuracao as { titulo?: string; descricao?: string; texto_botao?: string };

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-24">
      <div className="flex flex-col items-center gap-5 rounded-[2rem] bg-gradient-to-br from-[#0B0D12] to-[#1C2030] px-8 py-16 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <h3 className="font-display text-3xl font-semibold tracking-tight text-white">{c.titulo ?? "Seu aparelho atual pode valer mais do que você imagina"}</h3>
          {c.descricao && <p className="mt-3 max-w-md text-sm text-white/55">{c.descricao}</p>}
        </div>
        <Link href="/loja/trade-in" className="shrink-0 rounded-full bg-white px-8 py-4 text-sm font-semibold text-[#0B0D12] transition-transform hover:-translate-y-0.5">
          {c.texto_botao ?? "Avaliar meu aparelho"}
        </Link>
      </div>
    </section>
  );
}

export function BlocoAssistencia({ secao }: { secao: HomeSecao }) {
  const c = secao.configuracao as { itens?: (ItemLista & { icone?: string })[] };
  const itens = c.itens ?? [];
  if (itens.length === 0) return null;

  return (
    <section className="bg-[#0B0D12] px-4 py-20">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 sm:grid-cols-4">
        {itens.map((item, i) => {
          const Icone = ICONES[item.icone ?? ""] ?? ShieldCheck;
          return (
            <div key={i} className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06] text-white">
                <Icone className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <span className="text-sm font-semibold text-white">{item.titulo}</span>
              <span className="text-xs leading-relaxed text-white/50">{item.descricao}</span>
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
      <h2 className="mb-8 font-display text-2xl font-semibold tracking-tight text-foreground">{c.titulo ?? "O que dizem nossos clientes"}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {itens.map((item, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-2xl border border-black/[0.06] p-5">
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
      {c.titulo && <h2 className="mb-6 font-display text-2xl font-semibold tracking-tight text-foreground">{c.titulo}</h2>}
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
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-black/[0.06] p-8">
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
      {c.titulo && <h2 className="mb-4 font-display text-2xl font-semibold tracking-tight text-foreground">{c.titulo}</h2>}
      <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{c.corpo}</p>
    </section>
  );
}
