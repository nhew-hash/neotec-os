import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { listarProdutosLoja } from "@/services/loja/loja-publica.service";
import { ProdutoCard } from "@/components/loja/produto-card";
import type { HomeSecao } from "@/types";

export async function BlocoVitrineProdutos({ secao }: { secao: HomeSecao }) {
  const c = secao.configuracao as { titulo?: string; quantidade?: number };
  const produtos = await listarProdutosLoja();
  const selecionados = produtos.slice(0, c.quantidade ?? 8);

  if (selecionados.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-20">
      <div className="mb-8 flex items-end justify-between">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">{c.titulo ?? "Destaques"}</h2>
        <Link href="/loja/categoria/iphone" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          Ver tudo<ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {selecionados.map((p) => <ProdutoCard key={p.id} produto={p} />)}
      </div>
    </section>
  );
}
