import type { Metadata } from "next";
import { CatalogoCliente } from "@/components/achadinhos/catalogo-cliente";
import { HeroAchadinhos } from "@/components/achadinhos/hero-achadinhos";
import { JsonLd } from "@/components/achadinhos/json-ld";
import { urlSite } from "@/lib/achadinhos/apresentacao";
import { categoriasDoCatalogo, listarCatalogoPublico } from "@/services/achadinhos/achadinhos.publico.service";

// A página é gerada uma vez e reaproveitada por 60s; o painel e a API também
// pedem a regeneração na hora (`revalidatePath`) quando algo muda.
export const revalidate = 60;

export const metadata: Metadata = {
  title: { absolute: "Achadinhos da Neotec | Ofertas selecionadas do Mercado Livre" },
  alternates: { canonical: "/achadinhos" },
  openGraph: { title: "Achadinhos da Neotec", description: "Ofertas que encontramos e valem a pena.", url: "/achadinhos" },
};

export default async function AchadinhosPage() {
  const produtos = await listarCatalogoPublico();
  const categorias = categoriasDoCatalogo(produtos);
  const destaques = produtos.filter((p) => p.destaque).slice(0, 8);
  const base = urlSite();

  return (
    <>
      <HeroAchadinhos total={produtos.length} destaques={destaques} />
      <CatalogoCliente produtos={produtos} categorias={categorias} />
      {produtos.length > 0 && (
        <JsonLd
          dados={{
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Achadinhos da Neotec",
            itemListElement: produtos.slice(0, 50).map((p, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: `${base}/achadinhos/${p.slug}`,
              name: p.nome,
            })),
          }}
        />
      )}
    </>
  );
}
