import { listarProdutosLoja } from "@/services/loja/loja-publica.service";
import { listarLacradosModelosPublico } from "@/services/lacrados/lacrados-publico.service";
import { ProdutoCard } from "@/components/loja/produto-card";
import { ModelosLacradosGrid } from "@/components/loja/lacrados-lista-cliente";
import { labelCategoria } from "@/components/loja/categorias";

// Mesmo motivo das páginas de lacrado — estoque nunca pode ficar em cache.
export const revalidate = 0;

/**
 * iPad, Mac e Apple Watch LACRADOS vivem no catálogo de lacrados (variantes
 * com cor/armazenamento/estoque), não em `produtos`. Sem isso nunca
 * apareciam em lugar nenhum: /loja/lacrados mostra só iPhone e /loja/android
 * só marcas não-Apple. Aqui entram na categoria certa, pelo nome do modelo.
 */
const FAMILIA_LACRADOS: Record<string, RegExp> = {
  ipad: /\bipad\b/i,
  mac: /macbook|\bimac\b|mac\s*mini|mac\s*studio/i,
  apple_watch: /apple\s*watch/i,
};

export default async function LojaCategoriaPage({ params }: { params: Promise<{ categoria: string }> }) {
  const { categoria } = await params;
  const todosProdutos = await listarProdutosLoja();
  const produtos = todosProdutos.filter((p) => p.categoria === categoria);

  const familia = FAMILIA_LACRADOS[categoria];
  const lacrados = familia
    ? (await listarLacradosModelosPublico()).filter((m) => m.marca?.toLowerCase() === "apple" && familia.test(m.nome))
    : [];
  const total = produtos.length + lacrados.length;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="mb-1 font-display text-section-title text-foreground">{labelCategoria(categoria)}</h1>
      <p className="mb-8 text-sm text-muted-foreground">{total} produto(s) disponível(is)</p>

      {total === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Nenhum produto nessa categoria no momento.</p>
      ) : (
        <div className="space-y-8">
          {produtos.length > 0 && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {produtos.map((p) => <ProdutoCard key={p.id} produto={p} />)}
            </div>
          )}
          {lacrados.length > 0 && <ModelosLacradosGrid modelos={lacrados} />}
        </div>
      )}
    </div>
  );
}
