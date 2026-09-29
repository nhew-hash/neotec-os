import { CheckCircle2, Wrench, ArrowRight } from "lucide-react";
import Link from "next/link";
import { ProdutoQuenteCliente } from "./produto-quente-cliente";
import { CtaFixoMobile } from "./cta-fixo-mobile";
import { OfertaFrete } from "./oferta-frete";
import { VideoProduto } from "./video-produto";
import { ProvaSocial } from "./prova-social";
import { Accordion } from "./accordion";
import { BadgesProduto, AvisoEstoque } from "../badges-e-economia";
import { FaixaSelosConfianca } from "../faixa-selos-confianca";
import { TabelaParcelamento } from "../tabela-parcelamento";
import type { ProdutoLoja, AparelhoDisponivelLoja } from "@/types";
import type { ConteudoProdutoQuente } from "@/services/ia/produto-quente-ia.service";

/**
 * Página "Produto Quente" — renderizada dentro da MESMA rota
 * `/loja/produto/[slug]` (nenhuma rota nova, item 2 do brief) quando
 * `produto.produto_quente` está ligado. As seções abaixo só aparecem
 * quando existe dado real: sem conteúdo de IA gerado ainda, sem
 * avaliação, sem vídeo — cada seção decide sozinha se tem o que
 * mostrar (item 10/14: "a seção simplesmente não aparece").
 */
export function ProdutoQuentePage({
  produto, aparelhosDisponiveis, pixDescontoPercentual, estoqueReal, limiteEstoqueBaixo, maisVendido, totalVendas, contadorVendasAtivo,
}: {
  produto: ProdutoLoja;
  aparelhosDisponiveis: AparelhoDisponivelLoja[];
  pixDescontoPercentual: number;
  estoqueReal: number;
  limiteEstoqueBaixo: number;
  maisVendido: boolean;
  totalVendas: number;
  contadorVendasAtivo: boolean;
}) {
  const conteudo = (produto.produto_quente_conteudo as ConteudoProdutoQuente | null) ?? null;
  const ultimasUnidades = estoqueReal > 0 && estoqueReal <= limiteEstoqueBaixo;
  const precoExibido = aparelhosDisponiveis[0]?.preco_venda ?? produto.preco_venda;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 pt-10 lg:pb-10">
      <ProdutoQuenteCliente
        produto={produto}
        aparelhosDisponiveis={aparelhosDisponiveis}
        pixDescontoPercentual={pixDescontoPercentual}
        headline={conteudo?.headline || produto.nome}
        subtitulo={conteudo?.subtitulo ?? null}
        badges={<BadgesProduto selosManuais={produto.selos_manuais} maisVendido={maisVendido} ultimasUnidades={ultimasUnidades} />}
        aviso={
          <>
            <AvisoEstoque quantidade={estoqueReal} limiteEstoqueBaixo={limiteEstoqueBaixo} />
            {contadorVendasAtivo && totalVendas > 0 && (
              <p className="text-xs text-muted-foreground">{totalVendas} vendido{totalVendas > 1 ? "s" : ""}</p>
            )}
          </>
        }
      />

      <div className="mt-14 flex flex-col gap-14">
        {conteudo && conteudo.beneficios.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="font-display text-xl font-bold text-foreground">Por que esse produto</h2>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {conteudo.beneficios.map((b, i) => (
                <div key={i} className="flex items-start gap-2 rounded-xl bg-[#FAFBFC] p-3.5 text-sm text-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />{b}
                </div>
              ))}
            </div>
          </section>
        )}

        <VideoProduto url={produto.produto_quente_video_url} />

        {conteudo && conteudo.destaques.length > 0 && (
          <section className="flex flex-wrap gap-2">
            {conteudo.destaques.map((d, i) => (
              <span key={i} className="rounded-full bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary">{d}</span>
            ))}
          </section>
        )}

        <section className="flex flex-col gap-3 rounded-3xl border border-black/[0.06] p-5">
          <h2 className="font-display text-lg font-bold text-foreground">Oferta</h2>
          <OfertaFrete />
          {precoExibido != null && precoExibido > 0 && <TabelaParcelamento valor={precoExibido} />}
        </section>

        <ProvaSocial produtoId={produto.id} />

        {conteudo?.descricaoComercial && (
          <section className="flex flex-col gap-2">
            <h2 className="font-display text-lg font-bold text-foreground">Sobre o produto</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{conteudo.descricaoComercial}</p>
          </section>
        )}

        {conteudo && conteudo.faq.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="font-display text-lg font-bold text-foreground">Perguntas frequentes</h2>
            <Accordion itens={conteudo.faq.map((f) => ({ titulo: f.pergunta, conteudo: f.resposta }))} />
          </section>
        )}

        {conteudo && conteudo.objecoes.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="font-display text-lg font-bold text-foreground">Ainda com dúvidas?</h2>
            <Accordion itens={conteudo.objecoes.map((o) => ({ titulo: o.objecao, conteudo: o.resposta }))} />
          </section>
        )}

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-bold text-foreground">Garantia e confiança</h2>
          <FaixaSelosConfianca />
        </section>

        <div className="flex items-start gap-3 rounded-2xl bg-[#FAFBFC] p-4">
          <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-xs text-foreground">
            Precisar de assistência depois? <Link href="/consultar-os" className="font-medium text-primary hover:underline inline-flex items-center gap-0.5">Acompanhe sua OS aqui<ArrowRight className="h-3 w-3" /></Link>
          </p>
        </div>
      </div>

      <CtaFixoMobile preco={precoExibido} />
    </div>
  );
}
