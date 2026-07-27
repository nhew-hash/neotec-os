"use client";

import { useState, useEffect } from "react";
import { calcularDestaquePrecoLojaAction } from "@/services/precificacao/precificacao-loja.actions";
import { DestaquePreco } from "./destaque-preco";
import type { DestaquePrecoLoja } from "@/services/precificacao/precificacao-publico.service";

/**
 * Busca automática (nunca espera clique) — diferente da antiga
 * `TabelaParcelamento`, que só carregava sob demanda. Cache de 1h já
 * existe no servidor (mesma fonte da Fase 79/88), então buscar direto
 * ao montar não sobrecarrega nada.
 */
export function DestaquePrecoCliente({ precoVenda, precoLiquidoDesejado }: { precoVenda: number; precoLiquidoDesejado: number | null }) {
  const [destaque, setDestaque] = useState<DestaquePrecoLoja | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (precoVenda <= 0) return;
    setCarregando(true);
    calcularDestaquePrecoLojaAction(precoVenda, precoLiquidoDesejado).then((result) => {
      setCarregando(false);
      if (result.success) setDestaque(result.data);
    });
  }, [precoVenda, precoLiquidoDesejado]);

  if (carregando) {
    return (
      <div className="flex flex-col gap-2">
        <div className="h-9 w-40 animate-pulse rounded bg-secondary" />
        <div className="h-9 w-full animate-pulse rounded-xl bg-secondary" />
      </div>
    );
  }

  if (!destaque) return null;
  return <DestaquePreco destaque={destaque} />;
}
