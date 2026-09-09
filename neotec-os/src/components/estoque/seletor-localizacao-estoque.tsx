"use client";

import { useState } from "react";
import { atualizarLocalizacaoEstoqueAction } from "@/services/estoque/estoque.actions";

export function SeletorLocalizacaoEstoque({ aparelhoId, valorInicial }: { aparelhoId: string; valorInicial: "loja_fisica" | "fornecedor" }) {
  const [valor, setValor] = useState(valorInicial);
  const [salvando, setSalvando] = useState(false);

  async function handleChange(novoValor: "loja_fisica" | "fornecedor") {
    setValor(novoValor);
    setSalvando(true);
    await atualizarLocalizacaoEstoqueAction(aparelhoId, novoValor);
    setSalvando(false);
  }

  return (
    <select
      value={valor}
      onChange={(e) => handleChange(e.target.value as "loja_fisica" | "fornecedor")}
      disabled={salvando}
      className="rounded-md border border-border bg-white px-2 py-1 text-xs"
    >
      <option value="loja_fisica">Loja física (entrega na hora)</option>
      <option value="fornecedor">Fornecedor — fora da cidade</option>
    </select>
  );
}
