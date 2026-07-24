import { notFound } from "next/navigation";
import { Smartphone } from "lucide-react";
import { buscarProdutoLojaPorSlug, listarAparelhosDisponiveisLoja } from "@/services/loja/loja-publica.service";
import { AdicionarAoCarrinho } from "@/components/loja/adicionar-ao-carrinho";
import { labelCategoria } from "@/components/loja/categorias";

export default async function LojaProdutoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const produto = await buscarProdutoLojaPorSlug(slug);
  if (!produto) notFound();

  const aparelhosDisponiveis = await listarAparelhosDisponiveisLoja(produto.id);

  return (
    <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-10 px-4 py-10 lg:grid-cols-2">
      <div className="flex aspect-square items-center justify-center rounded-3xl bg-[#FAFBFC]">
        <Smartphone className="h-32 w-32 text-black/10" strokeWidth={0.75} />
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{labelCategoria(produto.categoria)}</span>
          <h1 className="mt-1 font-display text-2xl font-semibold text-foreground sm:text-3xl">{produto.nome}</h1>
        </div>

        <AdicionarAoCarrinho produto={produto} aparelhosDisponiveis={aparelhosDisponiveis} />

        {produto.descricao_loja && (
          <div className="mt-4 border-t border-black/[0.06] pt-4">
            <p className="text-sm leading-relaxed text-muted-foreground">{produto.descricao_loja}</p>
          </div>
        )}
      </div>
    </div>
  );
}
