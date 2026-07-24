import Link from "next/link";
import { ShieldCheck, Repeat, Wallet, Wrench, ArrowRight } from "lucide-react";
import { listarProdutosLoja } from "@/services/loja/loja-publica.service";
import { ProdutoCard } from "@/components/loja/produto-card";
import { CATEGORIAS_LOJA } from "@/components/loja/categorias";

const DIFERENCIAIS = [
  { icon: ShieldCheck, titulo: "Garantia de verdade", descricao: "Todo aparelho sai com garantia Neotec, revisado pela nossa assistência técnica." },
  { icon: Wallet, titulo: "Parcele em até 12x", descricao: "Sem juros, direto na compra — sem burocracia." },
  { icon: Repeat, titulo: "Troque seu usado", descricao: "Seu aparelho atual pode virar parte do pagamento do novo." },
  { icon: Wrench, titulo: "Assistência própria", descricao: "A mesma equipe que conserta também revisa cada aparelho vendido." },
];

export default async function LojaHomePage() {
  const produtos = await listarProdutosLoja();
  const destaques = produtos.slice(0, 8);

  return (
    <div className="flex flex-col">
      {/* Hero — tipografia grande e confiante, textura sutil de fundo */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#F7F9FC] to-white px-4 py-24 text-center sm:py-32">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "radial-gradient(circle, #0B0D12 1px, transparent 1px)", backgroundSize: "28px 28px" }}
        />
        <div className="relative animate-reveal-up">
          <h1 className="mx-auto max-w-3xl font-display text-[2.75rem] font-semibold leading-[1.05] tracking-tight text-foreground sm:text-7xl">
            iPhone, iPad e acessórios<br />com garantia de verdade
          </h1>
          <p className="mx-auto mt-6 max-w-md text-[15px] leading-relaxed text-muted-foreground sm:text-lg">
            Aparelhos novos e seminovos revisados, com a assistência técnica da Neotec por trás de cada venda.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/loja/categoria/iphone"
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-9 py-4 text-sm font-semibold text-white shadow-xl shadow-primary/25 transition-transform hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-primary/30"
            >
              Ver iPhones disponíveis<ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/loja/trade-in"
              className="inline-flex items-center justify-center rounded-full border border-black/[0.1] px-9 py-4 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
            >
              Troque seu usado
            </Link>
          </div>
        </div>
      </section>

      {/* Categorias — logo depois do hero, acesso rápido */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {CATEGORIAS_LOJA.map((c, i) => (
            <Link
              key={c.valor}
              href={`/loja/categoria/${c.valor}`}
              style={{ animationDelay: `${i * 60}ms` }}
              className="animate-reveal-up flex flex-col items-center gap-2.5 rounded-2xl border border-black/[0.06] bg-[#FAFBFC] py-9 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5 hover:shadow-md"
            >
              <span className="text-3xl">{c.emoji}</span>
              <span className="text-sm font-medium text-foreground">{c.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Seção escura — diferenciais, contraste com o resto (padrão clássico de loja premium) */}
      <section className="bg-[#0B0D12] px-4 py-20">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 sm:grid-cols-4">
          {DIFERENCIAIS.map((d) => (
            <div key={d.titulo} className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06] text-white">
                <d.icon className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <span className="text-sm font-semibold text-white">{d.titulo}</span>
              <span className="text-xs leading-relaxed text-white/50">{d.descricao}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Destaques */}
      {destaques.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-4 py-20">
          <div className="mb-8 flex items-end justify-between">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">Destaques</h2>
            <Link href="/loja/categoria/iphone" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              Ver tudo<ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {destaques.map((p) => <ProdutoCard key={p.id} produto={p} />)}
          </div>
        </section>
      )}

      {produtos.length === 0 && (
        <section className="mx-auto w-full max-w-6xl px-4 pb-20 text-center">
          <p className="text-sm text-muted-foreground">Nenhum produto publicado na loja ainda.</p>
        </section>
      )}

      {/* Banner trade-in */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-24">
        <div className="flex flex-col items-center gap-5 rounded-[2rem] bg-gradient-to-br from-[#0B0D12] to-[#1C2030] px-8 py-16 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <h3 className="font-display text-3xl font-semibold tracking-tight text-white">Seu aparelho atual pode valer mais do que você imagina</h3>
            <p className="mt-3 max-w-md text-sm text-white/55">Conta pra gente sobre ele e recebe uma proposta pra usar como parte do pagamento.</p>
          </div>
          <Link href="/loja/trade-in" className="shrink-0 rounded-full bg-white px-8 py-4 text-sm font-semibold text-[#0B0D12] transition-transform hover:-translate-y-0.5">
            Avaliar meu aparelho
          </Link>
        </div>
      </section>
    </div>
  );
}
