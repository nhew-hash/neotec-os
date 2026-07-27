"use client";

import { useState, type ReactNode } from "react";
import { Smartphone } from "lucide-react";
import { AdicionarLacradoAoCarrinho } from "./adicionar-lacrado-ao-carrinho";
import type { CatalogoLacradoVariante, CatalogoLacradoModelo } from "@/types";

type Variante = Pick<CatalogoLacradoVariante, "id" | "cor" | "armazenamento" | "quantidade" | "preco_venda" | "fotos">;

/**
 * Junta a imagem grande + o seletor de variante, porque a imagem
 * precisa reagir à cor escolhida — sem isso, ficava estática
 * (mostrando sempre a primeira foto do modelo, ignorando a cor
 * selecionada). `children` recebe o resto do conteúdo da coluna
 * direita (título, destaques, trade-in) — só o bloco de
 * cor/armazenamento/preço fica de fato dentro desse componente.
 */
export function LacradoPdpCliente({
  modelo, variantes, nomeModelo, conteudoAntes, conteudoDepois,
}: {
  modelo: Pick<CatalogoLacradoModelo, "id" | "nome">;
  variantes: Variante[];
  nomeModelo: string;
  conteudoAntes: ReactNode;
  conteudoDepois: ReactNode;
}) {
  const [fotosAtuais, setFotosAtuais] = useState<string[]>(variantes[0]?.fotos ?? []);

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
      <div className="lg:sticky lg:top-24 lg:h-fit">
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-[#FAFBFC] to-[#F0F2F6]">
          {fotosAtuais[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fotosAtuais[0]} alt={nomeModelo} className="h-full w-full object-contain" />
          ) : (
            <Smartphone className="h-32 w-32 text-black/[0.08]" strokeWidth={0.75} />
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {conteudoAntes}
        <AdicionarLacradoAoCarrinho modelo={modelo} variantes={variantes} onVarianteFotosChange={setFotosAtuais} />
        {conteudoDepois}
      </div>
    </div>
  );
}
