import { listarProdutosLoja } from "@/services/loja/loja-publica.service";
import { ProdutoCard } from "@/components/loja/produto-card";
import { labelCategoria } from "@/components/loja/categorias";

export default async function LojaCategoriaPage({ params }: { params: Promise<{ categoria: string }> }) {
  const { categoria } = await params;
  const todosProdutos = await listarProdutosLoja();
  const produtos = todosProdutos.filter((p) => p.categoria === categoria);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="mb-1 font-display text-2xl font-semibold text-foreground">{labelCategoria(categoria)}</h1>
      <p className="mb-8 text-sm text-muted-foreground">{produtos.length} produto(s) disponível(is)</p>

      {produtos.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Nenhum produto nessa categoria no momento.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {produtos.map((p) => <ProdutoCard key={p.id} produto={p} />)}
        </div>
      )}
    </div>
  );
}
