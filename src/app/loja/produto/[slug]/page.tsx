import { notFound } from "next/navigation";
import Link from "next/link";
import { Wrench, ArrowRight, Repeat } from "lucide-react";
import { buscarProdutoLojaPorSlug, listarAparelhosDisponiveisLoja } from "@/services/loja/loja-publica.service";
import { obterConfigMarketingPublico, contarVendasRealDoProduto, contarEstoqueRealDoProduto } from "@/services/marketing/marketing-publico.service";
import { ProdutoPdpCliente } from "@/components/loja/produto-pdp-cliente";
import { BadgesProduto, AvisoEstoque } from "@/components/loja/badges-e-economia";
import { FaixaSelosConfianca } from "@/components/loja/faixa-selos-confianca";
import { RegistrarVisto, VistosRecentesLista } from "@/components/loja/vistos-recentes";
import { labelCategoria } from "@/components/loja/categorias";

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
  const ultimasUnidades = estoqueReal > 0 && estoqueReal <= limiteEstoqueBaixo;
  const maisVendido = totalVendas >= 10; // limiar simples — "mais vendido" só quando tem venda de verdade o suficiente pra dizer isso com honestidade

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <ProdutoPdpCliente
        produto={produto}
        aparelhosDisponiveis={aparelhosDisponiveis}
        pixDescontoPercentual={config?.pix_desconto_percentual ?? 0}
        conteudoAntes={
          <>
            <div>
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{labelCategoria(produto.categoria)}</span>
              <h1 className="mt-1 font-display text-2xl font-semibold text-foreground sm:text-3xl">{produto.nome}</h1>
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
            {produto.mostrar_trade_in && (
              <Link
                href="/loja/trade-in"
                className="flex items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 transition-colors hover:bg-primary/10"
              >
                <div className="flex items-center gap-3">
                  <Repeat className="h-4 w-4 shrink-0 text-primary" />
                  <p className="text-xs font-medium text-foreground">Tem um aparelho pra dar de entrada? Avalie o seu agora</p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-primary" />
              </Link>
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
