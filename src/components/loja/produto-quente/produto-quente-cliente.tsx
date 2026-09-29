"use client";

import { useState, type ReactNode } from "react";
import { GaleriaFotos } from "../galeria-fotos";
import { AdicionarAoCarrinho } from "../adicionar-ao-carrinho";
import type { ProdutoLoja, AparelhoDisponivelLoja } from "@/types";

/**
 * Shell da página Produto Quente — Hero (galeria + headline + CTA).
 * Mesma lógica de sincronizar a galeria com a unidade/variante
 * selecionada que já existe em `ProdutoPdpCliente` (reaproveitada, não
 * reinventada), só que layout de uma coluna em mobile / duas em
 * desktop pensado pra ser mais "denso" de intenção de compra do que a
 * PDP normal — sem duplicar `AdicionarAoCarrinho`/`GaleriaFotos`.
 */
export function ProdutoQuenteCliente({
  produto, aparelhosDisponiveis, pixDescontoPercentual, headline, subtitulo, badges, aviso,
}: {
  produto: ProdutoLoja;
  aparelhosDisponiveis: AparelhoDisponivelLoja[];
  pixDescontoPercentual: number;
  headline: string;
  subtitulo: string | null;
  badges: ReactNode;
  aviso: ReactNode;
}) {
  const fotosIniciais = aparelhosDisponiveis[0]?.fotos?.length ? aparelhosDisponiveis[0].fotos : produto.fotos;
  const [fotosAtuais, setFotosAtuais] = useState<string[]>(fotosIniciais ?? []);

  function handleAparelhoChange(aparelhoId: string | null) {
    const aparelho = aparelhosDisponiveis.find((a) => a.id === aparelhoId);
    const fotos = aparelho?.fotos?.length ? aparelho.fotos : produto.fotos;
    setFotosAtuais(fotos ?? []);
  }

  return (
    <div className="flex flex-col gap-8 lg:grid lg:grid-cols-2 lg:items-start lg:gap-12">
      <div className="lg:sticky lg:top-24">
        <GaleriaFotos fotos={fotosAtuais} alt={produto.nome} />
      </div>

      <div id="comprar-agora" className="flex flex-col gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold leading-tight text-foreground sm:text-4xl">{headline}</h1>
          {subtitulo && <p className="mt-2 text-base text-muted-foreground">{subtitulo}</p>}
        </div>

        {badges}
        {aviso}

        <AdicionarAoCarrinho
          produto={produto}
          aparelhosDisponiveis={aparelhosDisponiveis}
          pixDescontoPercentual={pixDescontoPercentual}
          onAparelhoChange={handleAparelhoChange}
          modoComprarAgora
        />
      </div>
    </div>
  );
}
