import Link from "next/link";
import { listarProdutosLoja } from "@/services/loja/loja-publica.service";
import { ProdutoCard } from "@/components/loja/produto-card";
import { CATEGORIAS_LOJA } from "@/components/loja/categorias";

export default async function LojaHomePage() {
  const produtos = await listarProdutosLoja();
  const destaques = produtos.slice(0, 8);

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-gradient-to-b from-[#F7F9FC] to-white px-4 py-20 text-center">
        <h1 className="mx-auto max-w-2xl font-display text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
          iPhone, iPad e acessórios<br />com garantia de verdade
        </h1>
        <p className="mx-auto mt-4 max-w-md text-[15px] text-muted-foreground">
          Aparelhos novos e seminovos revisados, com a assistência técnica da Neotec por trás de cada venda.
        </p>
        <Link
          href="/loja/categoria/iphone"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-primary px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-opacity hover:opacity-90"
        >
          Ver iPhones disponíveis
        </Link>
      </section>

      {/* Categorias */}
      <section className="mx-auto w-full max-w-6xl px-4 py-14">
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
        <section className="mx-auto w-full max-w-6xl px-4 pb-20">
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
    </div>
  );
}
