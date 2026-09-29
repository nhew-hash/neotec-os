import { notFound } from "next/navigation";
import Link from "next/link";
import { Wrench, ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { buscarProdutoLojaPorSlug, listarAparelhosDisponiveisLoja } from "@/services/loja/loja-publica.service";
import { obterConfigMarketingPublico, contarVendasRealDoProduto, contarEstoqueRealDoProduto } from "@/services/marketing/marketing-publico.service";
import { ProdutoPdpCliente } from "@/components/loja/produto-pdp-cliente";
import { ProdutoQuentePage } from "@/components/loja/produto-quente/produto-quente-page";
import { BadgesProduto, AvisoEstoque } from "@/components/loja/badges-e-economia";
import { FaixaSelosConfianca } from "@/components/loja/faixa-selos-confianca";
import { RegistrarVisto, VistosRecentesLista } from "@/components/loja/vistos-recentes";
import { labelCategoria } from "@/components/loja/categorias";
import { CtaTradeIn } from "@/components/loja/cta-trade-in";
import { TradeInPopup } from "@/components/loja/trade-in-popup";
import { RastrearVisualizacaoProduto } from "@/components/loja/rastrear-visualizacao-produto";
import type { ConteudoProdutoQuente } from "@/services/ia/produto-quente-ia.service";

// Mesmo motivo das páginas de lacrado — estoque nunca pode ficar em cache.
export const revalidate = 0;

/**
 * Fase 256 — SEO por produto não existia em NENHUMA página de PDP
 * (lacuna real encontrada na auditoria); implementado aqui só pra
 * Produto Quente por decisão explícita (escopo desta fase). Produto
 * normal: devolve `{}`, que o Next mescla com o metadata herdado do
 * layout da loja — comportamento idêntico ao de antes desta fase.
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const produto = await buscarProdutoLojaPorSlug(slug).catch(() => null);
  if (!produto || !produto.produto_quente) return {};

  const conteudo = produto.produto_quente_conteudo as ConteudoProdutoQuente | null;
  const titulo = conteudo?.headline || produto.nome;
  const descricao = conteudo?.descricaoComercial?.slice(0, 300) || produto.descricao_loja?.slice(0, 300) || `${produto.nome} na Neotec — compre com garantia e entrega para todo o Brasil.`;
  const imagem = produto.fotos?.[0];

  return {
    title: `${titulo} | Neotec`,
    description: descricao,
    openGraph: {
      title: titulo,
      description: descricao,
      images: imagem ? [imagem] : undefined,
      type: "website",
    },
  };
}

export default async function LojaProdutoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const produto = await buscarProdutoLojaPorSlug(slug);
  if (!produto) notFound();

  const [aparelhosDisponiveis, config, totalVendas, estoqueReal] = await Promise.all([
    listarAparelhosDisponiveisLoja(produto.id),
    obterConfigMarketingPublico(),
    contarVendasRealDoProduto(produto.id),
    contarEstoqueRealDoProduto(produto.id),
  ]);

  const limiteEstoqueBaixo = config?.estoque_baixo_limite ?? 3;
  const maisVendido = totalVendas >= 10; // limiar simples — "mais vendido" só quando tem venda de verdade o suficiente pra dizer isso com honestidade

  // ---- Produto Quente: mesma URL, template diferente (item 2 do brief) ----
  if (produto.produto_quente) {
    const precoExibido = aparelhosDisponiveis[0]?.preco_venda ?? produto.preco_venda;
    return (
      <>
        <RastrearVisualizacaoProduto produtoId={produto.id} />
        {/* JSON-LD Product — não existia em nenhuma PDP antes desta fase, só dado real (nome/preço/imagem/disponibilidade), nada inventado. */}
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Product",
              name: produto.nome,
              image: produto.fotos ?? [],
              description: produto.descricao_loja ?? undefined,
              offers: precoExibido != null
                ? { "@type": "Offer", priceCurrency: "BRL", price: precoExibido, availability: estoqueReal > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" }
                : undefined,
            }),
          }}
        />
        <ProdutoQuentePage
          produto={produto}
          aparelhosDisponiveis={aparelhosDisponiveis}
          pixDescontoPercentual={config?.pix_desconto_percentual ?? 0}
          estoqueReal={estoqueReal}
          limiteEstoqueBaixo={limiteEstoqueBaixo}
          maisVendido={maisVendido}
          totalVendas={totalVendas}
          contadorVendasAtivo={config?.contador_vendas_ativo ?? false}
        />
        <div className="mx-auto max-w-5xl px-4">
          <RegistrarVisto id={produto.id} nome={produto.nome} slug={produto.slug} preco={produto.preco_venda} />
        </div>
      </>
    );
  }

  const ultimasUnidades = estoqueReal > 0 && estoqueReal <= limiteEstoqueBaixo;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <RastrearVisualizacaoProduto produtoId={produto.id} />
      {/* Fase 253 — popup de Trade-in só em iPhone Seminovo (categoria "iphone",
          ver categorias.ts); aponta pro mesmo fluxo de /loja/trade-in, nunca um
          sistema paralelo. */}
      {produto.categoria === "iphone" && (
        <TradeInPopup produtoNome={produto.nome} linkTradeIn={`/loja/trade-in?origem=${encodeURIComponent(produto.slug ?? produto.id)}`} />
      )}
      <ProdutoPdpCliente
        produto={produto}
        aparelhosDisponiveis={aparelhosDisponiveis}
        pixDescontoPercentual={config?.pix_desconto_percentual ?? 0}
        conteudoAntes={
          <>
            <div>
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{labelCategoria(produto.categoria)}</span>
              <h1 className="mt-1 font-display text-section-title text-foreground sm:text-3xl">{produto.nome}</h1>
            </div>

            <BadgesProduto selosManuais={produto.selos_manuais} maisVendido={maisVendido} ultimasUnidades={ultimasUnidades} />
            <AvisoEstoque quantidade={estoqueReal} limiteEstoqueBaixo={limiteEstoqueBaixo} />

            {config?.contador_vendas_ativo && totalVendas > 0 && (
              <p className="text-xs text-muted-foreground">{totalVendas} vendido{totalVendas > 1 ? "s" : ""}</p>
            )}
          </>
        }
        conteudoDepois={
          <>
            {/* iPhone Seminovo (categoria "iphone"): CTA específico e sempre visível — é
                justamente aqui que faz mais sentido o cliente pensar em dar o usado como
                parte do pagamento (Fase 250). Outros produtos mantêm o comportamento de
                antes, controlado pelo toggle manual `mostrar_trade_in` do Central de Cadastro. */}
            {produto.categoria === "iphone" ? (
              <CtaTradeIn texto="Dê seu iPhone como parte do pagamento" />
            ) : (
              produto.mostrar_trade_in && <CtaTradeIn />
            )}

            {produto.descricao_loja && (
              <div className="mt-4 border-t border-black/[0.06] pt-4">
                <p className="text-sm leading-relaxed text-muted-foreground">{produto.descricao_loja}</p>
              </div>
            )}

            <FaixaSelosConfianca />

            <div className="mt-2 flex items-start gap-3 rounded-2xl bg-[#FAFBFC] p-4">
              <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-xs text-foreground">
                Precisar de assistência depois? <Link href="/consultar-os" className="font-medium text-primary hover:underline inline-flex items-center gap-0.5">Acompanhe sua OS aqui<ArrowRight className="h-3 w-3" /></Link>
              </p>
            </div>
          </>
        }
      />

      <RegistrarVisto id={produto.id} nome={produto.nome} slug={produto.slug} preco={produto.preco_venda} />
      <VistosRecentesLista excluirId={produto.id} />
    </div>
  );
}
