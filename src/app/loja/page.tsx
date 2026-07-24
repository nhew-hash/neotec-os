import Link from "next/link";
import { ShieldCheck, Repeat, Wallet, Wrench } from "lucide-react";
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
      {/* Hero */}
      <section className="bg-gradient-to-b from-[#F7F9FC] to-white px-4 py-20 text-center sm:py-28">
        <h1 className="mx-auto max-w-2xl font-display text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-6xl">
          iPhone, iPad e acessórios<br />com garantia de verdade
        </h1>
        <p className="mx-auto mt-5 max-w-md text-[15px] text-muted-foreground sm:text-base">
          Aparelhos novos e seminovos revisados, com a assistência técnica da Neotec por trás de cada venda.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/loja/categoria/iphone"
            className="inline-flex items-center justify-center rounded-full bg-primary px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-opacity hover:opacity-90"
          >
            Ver iPhones disponíveis
          </Link>
          <Link
            href="/loja/trade-in"
            className="inline-flex items-center justify-center rounded-full border border-black/[0.1] px-8 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
          >
            Troque seu usado
          </Link>
        </div>
      </section>

      {/* Diferenciais */}
      <section className="mx-auto w-full max-w-6xl px-4 py-14">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {DIFERENCIAIS.map((d) => (
            <div key={d.titulo} className="flex flex-col items-center gap-2 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <d.icon className="h-5 w-5" />
              </div>
              <span className="text-sm font-semibold text-foreground">{d.titulo}</span>
              <span className="text-xs leading-relaxed text-muted-foreground">{d.descricao}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Categorias */}
      <section className="mx-auto w-full max-w-6xl px-4 py-6">
        <h2 className="mb-6 font-display text-xl font-semibold text-foreground">Categorias</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {CATEGORIAS_LOJA.map((c) => (
            <Link
              key={c.valor}
              href={`/loja/categoria/${c.valor}`}
              className="flex flex-col items-center gap-2 rounded-2xl border border-black/[0.06] bg-[#FAFBFC] py-8 transition-colors hover:border-primary/30 hover:bg-primary/5"
            >
              <span className="text-3xl">{c.emoji}</span>
              <span className="text-sm font-medium text-foreground">{c.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Destaques */}
      {destaques.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-4 py-14">
          <h2 className="mb-6 font-display text-xl font-semibold text-foreground">Destaques</h2>
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
      <section className="mx-auto w-full max-w-6xl px-4 pb-20">
        <div className="flex flex-col items-center gap-4 rounded-3xl bg-[#0B0D12] px-8 py-14 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <h3 className="font-display text-2xl font-semibold text-white">Seu aparelho atual pode valer mais do que você imagina</h3>
            <p className="mt-2 max-w-md text-sm text-white/60">Conta pra gente sobre ele e recebe uma proposta pra usar como parte do pagamento.</p>
          </div>
          <Link href="/loja/trade-in" className="shrink-0 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-[#0B0D12] transition-opacity hover:opacity-90">
            Avaliar meu aparelho
          </Link>
        </div>
      </section>
    </div>
  );
}
