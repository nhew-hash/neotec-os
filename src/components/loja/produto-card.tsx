"use client";

import Link from "next/link";
import { Smartphone, Scale, Check, Heart } from "lucide-react";
import { labelCategoria, formatarParcelamento } from "./categorias";
import { useComparador, MAX_COMPARACAO_ITENS } from "./comparador-context";
import { useFavoritos } from "./favoritos-context";
import { BadgesProduto, PrecoComEconomia } from "./badges-e-economia";
import type { ProdutoLoja } from "@/types";
import { Button } from "@/components/ui/button";

interface ProdutoCardProps {
  produto: ProdutoLoja;
  maisVendido?: boolean;
  ultimasUnidades?: boolean;
}

export function ProdutoCard({ produto, maisVendido, ultimasUnidades }: ProdutoCardProps) {
  const { idsSelecionados, alternar, estaSelecionado } = useComparador();
  const { ehFavorito, alternar: alternarFavorito } = useFavoritos();
  const selecionado = estaSelecionado(produto.id);
  const favorito = ehFavorito(produto.id);
  const podeComparar = produto.categoria === "iphone" || produto.categoria === "android";
  const limiteAtingido = !selecionado && idsSelecionados.length >= MAX_COMPARACAO_ITENS;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:shadow-[0_12px_32px_-12px_rgba(16,24,40,0.15)]">
      <Button
        type="button" variant="ghost" size="icon" pill
        onClick={(e) => { e.preventDefault(); alternarFavorito(produto.id); }}
        title={favorito ? "Remover dos favoritos" : "Favoritar"}
        className={`absolute left-2.5 top-2.5 z-10 h-7 w-7 border bg-white/90 hover:bg-white/90 ${
          favorito ? "border-danger text-danger" : "border-black/[0.08] text-muted-foreground hover:border-danger/40"
        }`}
      >
        <Heart className="h-3.5 w-3.5" fill={favorito ? "currentColor" : "none"} />
      </Button>

      {podeComparar && (
        <Button
          type="button" variant="ghost" size="icon" pill
          onClick={(e) => { e.preventDefault(); alternar(produto.id); }}
          disabled={limiteAtingido}
          title={selecionado ? "Remover da comparação" : "Comparar"}
          className={`absolute right-2.5 top-2.5 z-10 h-7 w-7 border ${
            selecionado ? "border-primary bg-primary text-white hover:bg-primary" : "border-black/[0.08] bg-white/90 text-muted-foreground hover:border-primary/40 hover:bg-white/90"
          }`}
        >
          {selecionado ? <Check className="h-3.5 w-3.5" /> : <Scale className="h-3.5 w-3.5" />}
        </Button>
      )}

      <Link href={produto.slug ? `/loja/produto/${produto.slug}` : "#"} className="flex flex-col">
        <div className="flex aspect-square items-center justify-center overflow-hidden bg-white">
          {produto.fotos?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={produto.fotos[0]} alt={produto.nome} className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <Smartphone className="h-16 w-16 text-black/[0.08] transition-transform duration-500 group-hover:scale-110" strokeWidth={1} />
          )}
        </div>
        <div className="flex flex-col gap-1.5 p-4">
          <BadgesProduto selosManuais={produto.selos_manuais} maisVendido={maisVendido} ultimasUnidades={ultimasUnidades} />
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{labelCategoria(produto.categoria)}</span>
          <span className="text-base font-semibold leading-snug text-foreground">{produto.nome}</span>
          {produto.preco_venda != null && (
            <>
              <span className="text-xs font-medium text-muted-foreground">A partir de</span>
              <PrecoComEconomia precoAtual={produto.preco_venda} precoAntigo={produto.preco_antigo} tamanho="compacto" />
              <span className="text-xs text-muted-foreground">{formatarParcelamento(produto.preco_venda)}</span>
            </>
          )}
        </div>
      </Link>
    </div>
  );
}
