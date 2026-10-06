import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ExternalLink, Info } from "lucide-react";
import { BarraCompraFixa } from "@/components/achadinhos/barra-compra-fixa";
import { BotaoComprar } from "@/components/achadinhos/botao-comprar";
import { CardProduto } from "@/components/achadinhos/card-produto";
import { EtiquetaDesconto } from "@/components/achadinhos/etiqueta-desconto";
import { TITULO } from "@/components/achadinhos/estilos";
import { GaleriaProduto } from "@/components/achadinhos/galeria-produto";
import { JsonLd } from "@/components/achadinhos/json-ld";
import { Preco } from "@/components/achadinhos/preco";
import { VideoProduto } from "@/components/achadinhos/video-produto";
import { descontoExibido, imagensDaGaleria, interpretarVideo, urlSite } from "@/lib/achadinhos/apresentacao";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/format";
import { buscarProdutoPublico, listarRelacionadosPublico } from "@/services/achadinhos/achadinhos.publico.service";

export const revalidate = 60;

/** Sem pré-gerar nenhuma página: cada produto vira ISR na primeira visita (cache de 60s + revalidatePath do painel/Claude). */
export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ slug: string }> };

// generateMetadata e a página usam o mesmo produto: `cache` faz uma consulta só por renderização.
const buscar = cache(buscarProdutoPublico);

function recortar(texto: string, max: number): string {
  const limpo = texto.replace(/\s+/g, " ").trim();
  return limpo.length <= max ? limpo : `${limpo.slice(0, max - 1).trimEnd()}…`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await buscar(slug);
  if (!p) return { title: "Achadinho fora do ar", robots: { index: false, follow: true } };

  const descricao =
    p.seo_descricao?.trim() ||
    (p.descricao ? recortar(p.descricao, 160) : "") ||
    `${p.nome}${p.preco_atual != null ? ` por ${formatCurrency(p.preco_atual)}` : ""}. Oferta selecionada pela Neotec, com compra no Mercado Livre.`;
  const titulo = p.seo_titulo?.trim() || p.nome;
  const imagem = p.imagem_og || p.imagem_principal;

  return {
    title: titulo,
    description: descricao,
    alternates: { canonical: `/achadinhos/${p.slug}` },
    openGraph: {
      title: titulo,
      description: descricao,
      url: `/achadinhos/${p.slug}`,
      type: "website",
      ...(imagem ? { images: [{ url: imagem, alt: p.nome }] } : {}),
    },
    twitter: { card: "summary_large_image", title: titulo, description: descricao, ...(imagem ? { images: [imagem] } : {}) },
  };
}

export default async function ProdutoAchadinhoPage({ params }: Props) {
  const { slug } = await params;
  const produto = await buscar(slug);
  if (!produto) notFound();

  const relacionados = await listarRelacionadosPublico(produto, 4);
  const imagens = imagensDaGaleria(produto);
  const desconto = descontoExibido(produto);
  const video = interpretarVideo(produto.video_url);
  const selo = produto.selo?.trim() || (produto.destaque ? "Destaque" : null);
  const pagina = `/achadinhos/${produto.slug}`;
  const base = urlSite();
  const paragrafos = (produto.descricao ?? "").split(/\n{2,}/).map((t) => t.trim()).filter(Boolean);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-5 md:pb-16">
      <nav aria-label="Você está em" className="text-sm text-achados-muted">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <li><Link href="/achadinhos" className="font-medium hover:text-achados-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Achadinhos</Link></li>
          {produto.categoria && (
            <>
              <li aria-hidden>/</li>
              <li>{produto.categoria}</li>
            </>
          )}
          <li aria-hidden>/</li>
          <li aria-current="page" className="max-w-[60vw] truncate text-achados-navy">{produto.nome}</li>
        </ol>
      </nav>

      <div className="mt-5 grid gap-8 md:grid-cols-[1.05fr_1fr] md:gap-12">
        <div className="flex flex-col gap-4 md:sticky md:top-24 md:self-start">
          <GaleriaProduto imagens={imagens} alt={produto.nome} />
          {video && <VideoProduto video={video} titulo={produto.nome} />}
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            {selo && <span className="w-fit rounded-full bg-achados-navy px-3 py-1 text-xs font-semibold text-white">{selo}</span>}
            <h1 className={cn(TITULO, "text-[28px] font-extrabold leading-[1.1] tracking-[-0.02em] sm:text-4xl")}>{produto.nome}</h1>
          </div>

          <section aria-label="Preço e compra" className="flex flex-col gap-5 rounded-3xl bg-white p-5 ring-1 ring-achados-line sm:p-6">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Preco produto={produto} variante="pdp" />
              {desconto !== null && <EtiquetaDesconto percentual={desconto} className="text-base" />}
            </div>
            <BotaoComprar slug={produto.slug} pagina={pagina} id="botao-comprar-principal" className="h-14 w-full text-base sm:text-lg" />
            <div className="flex flex-col gap-1.5 text-xs leading-relaxed text-achados-muted">
              <p className="flex gap-1.5">
                <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>Você vai para o Mercado Livre para finalizar a compra. Confira o preço e a disponibilidade lá antes de pagar: eles podem mudar.</span>
              </p>
              <p className="flex gap-1.5">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>A Neotec pode receber uma comissão pela compra, sem custo extra para você.</span>
              </p>
            </div>
          </section>

          {paragrafos.length > 0 && (
            <section aria-labelledby="titulo-descricao" className="flex flex-col gap-3">
              <h2 id="titulo-descricao" className={cn(TITULO, "text-xl font-extrabold tracking-tight")}>Sobre o produto</h2>
              <div className="flex max-w-prose flex-col gap-3 whitespace-pre-line leading-relaxed text-achados-navy/85">
                {paragrafos.map((t, i) => <p key={i}>{t}</p>)}
              </div>
            </section>
          )}

          {produto.informacoes.length > 0 && (
            <section aria-labelledby="titulo-informacoes" className="flex flex-col gap-3">
              <h2 id="titulo-informacoes" className={cn(TITULO, "text-xl font-extrabold tracking-tight")}>Informações</h2>
              <dl className="divide-y divide-achados-line overflow-hidden rounded-2xl bg-white ring-1 ring-achados-line">
                {produto.informacoes.map((info, i) => (
                  <div key={`${info.rotulo}-${i}`} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 px-4 py-3 text-sm">
                    <dt className="font-semibold text-achados-muted">{info.rotulo}</dt>
                    <dd className="text-achados-navy">{info.valor}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {produto.observacoes && (
            <aside aria-labelledby="titulo-observacoes" className="rounded-2xl border-l-4 border-achados-lime bg-white p-4 ring-1 ring-achados-line">
              <h2 id="titulo-observacoes" className={cn(TITULO, "text-base font-extrabold")}>Vale saber</h2>
              <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-achados-navy/85">{produto.observacoes}</p>
            </aside>
          )}
        </div>
      </div>

      {relacionados.length > 0 && (
        <section aria-labelledby="titulo-relacionados" className="mt-16">
          <h2 id="titulo-relacionados" className={cn(TITULO, "mb-5 text-2xl font-extrabold tracking-tight")}>
            {produto.categoria ? `Mais achadinhos de ${produto.categoria}` : "Mais achadinhos"}
          </h2>
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
            {relacionados.map((r) => (
              <li key={r.id}><CardProduto produto={r} /></li>
            ))}
          </ul>
        </section>
      )}

      <BarraCompraFixa
        slug={produto.slug}
        pagina={pagina}
        nome={produto.nome}
        precoTexto={produto.preco_atual != null ? formatCurrency(produto.preco_atual) : null}
        idBotaoPrincipal="botao-comprar-principal"
      />

      <JsonLd
        dados={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: produto.nome,
          ...(produto.descricao ? { description: recortar(produto.descricao, 500) } : {}),
          ...(imagens.length ? { image: imagens } : {}),
          // Sem `availability`, sem avaliações, sem marca: o catálogo não sabe disso e não vamos inventar.
          ...(produto.preco_atual != null
            ? { offers: { "@type": "Offer", url: `${base}${pagina}`, priceCurrency: "BRL", price: produto.preco_atual.toFixed(2) } }
            : {}),
        }}
      />
      <JsonLd
        dados={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Achadinhos", item: `${base}/achadinhos` },
            { "@type": "ListItem", position: 2, name: produto.nome, item: `${base}${pagina}` },
          ],
        }}
      />
    </div>
  );
}
