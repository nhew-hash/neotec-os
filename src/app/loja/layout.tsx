import type { ReactNode } from "react";
import { CarrinhoProvider } from "@/components/loja/carrinho-context";
import { ComparadorProvider } from "@/components/loja/comparador-context";
import { FavoritosProvider } from "@/components/loja/favoritos-context";
import { VistosRecentesProvider } from "@/components/loja/vistos-recentes-context";
import { LojaHeader } from "@/components/loja/loja-header";
import { LojaFooter } from "@/components/loja/loja-footer";
import { BarraComparacao } from "@/components/loja/barra-comparacao";
import { BarraTopoRotativa } from "@/components/loja/barra-topo-rotativa";
import { listarBarraTopoPublico } from "@/services/marketing/marketing-publico.service";

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
export default async function LojaLayout({ children }: { children: ReactNode }) {
  const barraTopoItens = await listarBarraTopoPublico();

  return (
    <CarrinhoProvider>
      <ComparadorProvider>
        <FavoritosProvider>
          <VistosRecentesProvider>
            <div className="flex min-h-screen flex-col bg-white">
              <BarraTopoRotativa itens={barraTopoItens} />
              <LojaHeader />
              <main className="flex-1">{children}</main>
              <LojaFooter />
              <BarraComparacao />
            </div>
          </VistosRecentesProvider>
        </FavoritosProvider>
      </ComparadorProvider>
    </CarrinhoProvider>
  );
}
