"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, ShoppingBag } from "lucide-react";
import { useCarrinho } from "./carrinho-context";
import { DestaquePrecoCliente } from "./destaque-preco-cliente";
import type { CatalogoLacradoVariante, CatalogoLacradoModelo } from "@/types";

type Variante = Pick<CatalogoLacradoVariante, "id" | "cor" | "armazenamento" | "quantidade" | "preco_venda" | "fotos">;

interface AdicionarLacradoAoCarrinhoProps {
  modelo: Pick<CatalogoLacradoModelo, "id" | "nome">;
  variantes: Variante[];
  onVarianteFotosChange?: (fotos: string[]) => void;
}

/**
 * Cliente escolhe COR primeiro, depois ARMAZENAMENTO — só as opções
 * que têm estoque de verdade aparecem em cada etapa (a lista já vem
 * pré-filtrada por quantidade > 0 do servidor, Fase 66). Nunca deixa
 * escolher uma combinação sem estoque — a combinação simplesmente não
 * existe na lista se não tiver.
 */
export function AdicionarLacradoAoCarrinho({ modelo, variantes, onVarianteFotosChange }: AdicionarLacradoAoCarrinhoProps) {
  const router = useRouter();
  const { adicionar } = useCarrinho();
  const [adicionado, setAdicionado] = useState(false);

  const cores = useMemo(() => Array.from(new Set(variantes.map((v) => v.cor))), [variantes]);
  const [corSelecionada, setCorSelecionada] = useState<string>(cores[0] ?? "");

  const armazenamentosDaCor = useMemo(
    () => variantes.filter((v) => v.cor === corSelecionada).map((v) => v.armazenamento),
    [variantes, corSelecionada]
  );
  const [armazenamentoSelecionado, setArmazenamentoSelecionado] = useState<string>(armazenamentosDaCor[0] ?? "");

  const varianteSelecionada = variantes.find((v) => v.cor === corSelecionada && v.armazenamento === armazenamentoSelecionado);

  // Sem fallback de propósito — se essa variante específica (cor +
  // armazenamento) não tem foto vinculada, avisa o pai com array
  // vazio. Nunca mostra a foto de outra cor por engano.
  useEffect(() => {
    onVarianteFotosChange?.(varianteSelecionada?.fotos ?? []);
  }, [varianteSelecionada, onVarianteFotosChange]);

  function handleSelecionarCor(cor: string) {
    setCorSelecionada(cor);
    const primeiroArmazenamento = variantes.find((v) => v.cor === cor)?.armazenamento ?? "";
    setArmazenamentoSelecionado(primeiroArmazenamento);
  }

  function handleAdicionar() {
    if (!varianteSelecionada) return;
    adicionar({
      tipo: "lacrado",
      id: varianteSelecionada.id,
      nome: modelo.nome,
      detalhe: `${varianteSelecionada.armazenamento} · ${varianteSelecionada.cor} · Lacrado`,
      valor: varianteSelecionada.preco_venda ?? 0,
    });
    setAdicionado(true);
    setTimeout(() => setAdicionado(false), 2000);
  }

  if (variantes.length === 0) {
    return <p className="rounded-xl bg-secondary py-3.5 text-center text-sm text-muted-foreground">Sem unidades disponíveis no momento</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      {varianteSelecionada?.preco_venda != null && (
        <div>
          <DestaquePrecoCliente precoVenda={varianteSelecionada.preco_venda} precoLiquidoDesejado={null} />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Cor</span>
        <div className="flex flex-wrap gap-2">
          {cores.map((cor) => (
            <button
              key={cor}
              type="button"
              onClick={() => handleSelecionarCor(cor)}
              className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                corSelecionada === cor ? "border-primary bg-primary/5 text-foreground" : "border-black/[0.08] text-muted-foreground hover:border-black/20"
              }`}
            >
              {cor}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Armazenamento</span>
        <div className="flex flex-wrap gap-2">
          {armazenamentosDaCor.map((arm) => (
            <button
              key={arm}
              type="button"
              onClick={() => setArmazenamentoSelecionado(arm)}
              className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                armazenamentoSelecionado === arm ? "border-primary bg-primary/5 text-foreground" : "border-black/[0.08] text-muted-foreground hover:border-black/20"
              }`}
            >
              {arm}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={handleAdicionar}
        disabled={!varianteSelecionada}
        className="flex items-center justify-center gap-2 rounded-full bg-primary py-4 text-base font-semibold text-white shadow-lg shadow-primary/20 transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {adicionado ? <Check className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
        {adicionado ? "Adicionado!" : "Adicionar ao carrinho"}
      </button>

      {adicionado && (
        <button type="button" onClick={() => router.push("/loja/carrinho")} className="text-center text-sm font-medium text-primary hover:underline">
          Ver carrinho →
        </button>
      )}
    </div>
  );
}
