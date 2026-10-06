import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Bricolage_Grotesque } from "next/font/google";
import { AchadinhosFooter } from "@/components/achadinhos/achadinhos-footer";
import { AchadinhosHeader } from "@/components/achadinhos/achadinhos-header";
import { CapturarUtm } from "@/components/achadinhos/capturar-utm";
import { urlSite } from "@/lib/achadinhos/apresentacao";
import { cn } from "@/lib/utils";

// Fonte própria dos títulos: dá ao Achadinhos uma voz mais jovem e expressiva
// que a do sistema (Space Grotesk), sem copiar a identidade da loja principal.
const titulos = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-achadinhos", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(urlSite()),
  title: { default: "Achadinhos da Neotec | Ofertas selecionadas do Mercado Livre", template: "%s | Achadinhos da Neotec" },
  description: "Ofertas que encontramos e valem a pena. Produtos selecionados pela equipe da Neotec, com compra direto no Mercado Livre.",
  openGraph: { siteName: "Achadinhos da Neotec", locale: "pt_BR", type: "website" },
  twitter: { card: "summary_large_image" },
};

/**
 * Rota pública, fora de (sistema) e fora de /loja: identidade visual própria
 * (azul Neotec, navy e lima), mas claramente da Neotec. Não herda nada do
 * layout da loja (carrinho, comparador, pixel) — o Achadinhos não tem checkout.
 */
export default function AchadinhosLayout({ children }: { children: ReactNode }) {
  return (
    <div className={cn(titulos.variable, "flex min-h-screen flex-col bg-achados-mist text-achados-navy")}>
      <CapturarUtm />
      <AchadinhosHeader />
      <main className="flex-1">{children}</main>
      <AchadinhosFooter />
    </div>
  );
}
