"use client";

import { useState } from "react";
import { atualizarMostrarTradeInAction } from "@/services/estoque/estoque.actions";

export function ToggleTradeIn({ produtoId, valorInicial }: { produtoId: string; valorInicial: boolean }) {
  const [ligado, setLigado] = useState(valorInicial);
  const [salvando, setSalvando] = useState(false);

  async function handleToggle() {
    const novoValor = !ligado;
    setLigado(novoValor); // otimista
    setSalvando(true);
    const result = await atualizarMostrarTradeInAction(produtoId, novoValor);
    setSalvando(false);
    if (!result.success) setLigado(!novoValor); // desfaz se der erro
  }

  return (
    <label className="flex items-center justify-between gap-3 border-b border-border py-1.5 text-sm last:border-0">
      <span className="text-muted-foreground">Mostrar &quot;avalie seu aparelho&quot; na página</span>
      <button
        type="button"
        onClick={handleToggle}
        disabled={salvando}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${ligado ? "bg-primary" : "bg-secondary"}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${ligado ? "translate-x-4" : "translate-x-0.5"}`} />
      </button>
    </label>
  );
}
