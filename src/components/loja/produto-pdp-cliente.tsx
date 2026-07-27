"use client";

import { useState, type ReactNode } from "react";
import { Smartphone } from "lucide-react";
import { AdicionarAoCarrinho } from "./adicionar-ao-carrinho";
import type { ProdutoLoja, AparelhoDisponivelLoja } from "@/types";

/**
 * Junta a imagem grande + o seletor de unidade, porque a imagem
 * precisa reagir à unidade escolhida — sem isso, ficava estática
 * (sempre a primeira foto do produto, ignorando qual aparelho
 * específico o cliente selecionou). Prioridade: foto real do
 * aparelho escolhido primeiro, foto geral do produto como fallback —
 * como pedido ("fotos reais do aparelho, depois as imagens oficiais
 * do modelo"). `conteudoAntes`/`conteudoDepois` recebem o resto da
 * coluna direita (título, badges, descrição, selos etc).
 */
export function ProdutoPdpCliente({
  produto, aparelhosDisponiveis, pixDescontoPercentual, conteudoAntes, conteudoDepois,
}: {
  produto: ProdutoLoja;
  aparelhosDisponiveis: AparelhoDisponivelLoja[];
  pixDescontoPercentual: number;
  conteudoAntes: ReactNode;
  conteudoDepois: ReactNode;
}) {
  const fotosIniciais = aparelhosDisponiveis[0]?.fotos?.length ? aparelhosDisponiveis[0].fotos : produto.fotos;
  const [fotosAtuais, setFotosAtuais] = useState<string[]>(fotosIniciais ?? []);

  function handleAparelhoChange(aparelhoId: string | null) {
    const aparelho = aparelhosDisponiveis.find((a) => a.id === aparelhoId);
    const fotos = aparelho?.fotos?.length ? aparelho.fotos : produto.fotos;
    setFotosAtuais(fotos ?? []);
  }

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
      <div className="lg:sticky lg:top-24 lg:h-fit">
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-[#FAFBFC] to-[#F0F2F6]">
          {fotosAtuais[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fotosAtuais[0]} alt={produto.nome} className="h-full w-full object-contain" />
          ) : (
            <Smartphone className="h-32 w-32 text-black/[0.08]" strokeWidth={0.75} />
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {conteudoAntes}
        <AdicionarAoCarrinho
          produto={produto}
          aparelhosDisponiveis={aparelhosDisponiveis}
          pixDescontoPercentual={pixDescontoPercentual}
          onAparelhoChange={handleAparelhoChange}
        />
        {conteudoDepois}
      </div>
    </div>
  );
}
