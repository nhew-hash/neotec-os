import type { ReactNode } from "react";
import { CarrinhoProvider } from "@/components/loja/carrinho-context";
import { LojaHeader } from "@/components/loja/loja-header";
import { LojaFooter } from "@/components/loja/loja-footer";

export const metadata = {
  title: "Neotec — iPhone, Mac, iPad e acessórios em Araguari",
  description: "Loja Neotec: iPhone, iPad, Apple Watch e acessórios, novos e seminovos, com garantia. Assistência técnica especializada.",
};

/**
 * Rota pública, fora do grupo (sistema) — não passa pelo middleware de
 * autenticação. Identidade visual própria, deliberadamente diferente
 * tanto do sistema interno (ferramenta de precisão) quanto do portal de
 * acompanhamento de OS (acolhedor/suporte) — aqui é loja de verdade,
 * confiante, produto em primeiro plano.
 */
export default function LojaLayout({ children }: { children: ReactNode }) {
  return (
    <CarrinhoProvider>
      <div className="flex min-h-screen flex-col bg-white">
        <LojaHeader />
        <main className="flex-1">{children}</main>
        <LojaFooter />
      </div>
    </CarrinhoProvider>
  );
}
