import { listarLacradosModelosPublico } from "@/services/lacrados/lacrados-publico.service";
import { listarProdutosLoja } from "@/services/loja/loja-publica.service";
import { ModelosLacradosGrid } from "@/components/loja/lacrados-lista-cliente";
import { ProdutoCard } from "@/components/loja/produto-card";

// Mesmo motivo da página individual — nunca cachear estoque.
export const revalidate = 0;

/**
 * Produtos avulsos (tabela `produtos`) de Android/tablet — antes não
 * apareciam em página nenhuma (o menu "Android / Tablet" só listava o
 * catálogo de lacrados), só na busca.
 */
const CATEGORIAS_ANDROID = new Set(["android", "smartphone", "tablet"]);

export default async function AndroidListaPage() {
  const [todos, produtos] = await Promise.all([listarLacradosModelosPublico(), listarProdutosLoja()]);
  const modelosAndroid = todos.filter((m) => m.marca?.toLowerCase() !== "apple");
  const produtosAndroid = produtos.filter((p) => CATEGORIAS_ANDROID.has(p.categoria));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="mb-1 font-display text-section-title text-foreground">Android / Tablet</h1>
      <p className="mb-6 text-sm text-muted-foreground">Smartphones e tablets Android — lacrados de fábrica com garantia, e outras opções da loja.</p>

      {modelosAndroid.length === 0 && produtosAndroid.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Nenhum modelo disponível no momento — confere com a gente pelo WhatsApp.</p>
      ) : (
        <div className="space-y-10">
          {modelosAndroid.length > 0 && <ModelosLacradosGrid modelos={modelosAndroid} />}
          {produtosAndroid.length > 0 && (
            <section>
              <h2 className="mb-4 text-base font-semibold text-foreground">Mais opções na loja</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {produtosAndroid.map((p) => <ProdutoCard key={p.id} produto={p} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
