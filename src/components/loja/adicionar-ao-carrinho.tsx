"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ShoppingBag } from "lucide-react";
import { useCarrinho } from "./carrinho-context";
import { formatCurrency } from "@/utils";
import type { ProdutoLoja, AparelhoDisponivelLoja } from "@/types";

const LABEL_CONDICAO: Record<string, string> = { novo: "Novo", seminovo: "Seminovo", usado: "Usado" };

interface AdicionarAoCarrinhoProps {
  produto: ProdutoLoja;
  aparelhosDisponiveis: AparelhoDisponivelLoja[];
}

export function AdicionarAoCarrinho({ produto, aparelhosDisponiveis }: AdicionarAoCarrinhoProps) {
  const router = useRouter();
  const { adicionar } = useCarrinho();
  const [aparelhoSelecionadoId, setAparelhoSelecionadoId] = useState<string | null>(aparelhosDisponiveis[0]?.id ?? null);
  const [adicionado, setAdicionado] = useState(false);

  const temVariantes = aparelhosDisponiveis.length > 0;
  const aparelhoSelecionado = aparelhosDisponiveis.find((a) => a.id === aparelhoSelecionadoId);
  const precoExibido = temVariantes ? aparelhoSelecionado?.preco_venda ?? produto.preco_venda : produto.preco_venda;

  function handleAdicionar() {
    if (temVariantes && aparelhoSelecionado) {
      adicionar({
        tipo: "aparelho",
        id: aparelhoSelecionado.id,
        nome: produto.nome,
        detalhe: [aparelhoSelecionado.memoria, aparelhoSelecionado.cor, LABEL_CONDICAO[aparelhoSelecionado.condicao]].filter(Boolean).join(" · "),
        valor: aparelhoSelecionado.preco_venda ?? 0,
      });
    } else {
      adicionar({ tipo: "produto", id: produto.id, nome: produto.nome, valor: produto.preco_venda ?? 0 });
    }
    setAdicionado(true);
    setTimeout(() => setAdicionado(false), 2000);
  }

  const disponivel = !temVariantes || aparelhosDisponiveis.length > 0;

  return (
    <div className="flex flex-col gap-5">
      {precoExibido != null && (
        <span className="font-display text-3xl font-bold text-foreground">{formatCurrency(precoExibido)}</span>
      )}

      {temVariantes && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Escolha a unidade</span>
          <div className="flex flex-col gap-2">
            {aparelhosDisponiveis.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAparelhoSelecionadoId(a.id)}
                className={`flex items-center justify-between rounded-xl border p-3 text-left transition-colors ${
                  aparelhoSelecionadoId === a.id ? "border-primary bg-primary/5" : "border-black/[0.08] hover:border-black/20"
                }`}
              >
                <span className="text-sm text-foreground">
                  {[a.memoria, a.cor, LABEL_CONDICAO[a.condicao]].filter(Boolean).join(" · ")}
                  {a.bateria != null && <span className="text-muted-foreground"> — bateria {a.bateria}%</span>}
                </span>
                {a.preco_venda != null && <span className="text-sm font-semibold text-foreground">{formatCurrency(a.preco_venda)}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {!disponivel ? (
        <p className="rounded-xl bg-secondary py-3.5 text-center text-sm text-muted-foreground">Sem unidades disponíveis no momento</p>
      ) : (
        <button
          type="button"
          onClick={handleAdicionar}
          className="flex items-center justify-center gap-2 rounded-full bg-primary py-4 text-base font-semibold text-white shadow-lg shadow-primary/20 transition-opacity hover:opacity-90"
        >
          {adicionado ? <Check className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
          {adicionado ? "Adicionado!" : "Adicionar ao carrinho"}
        </button>
      )}

      {adicionado && (
        <button type="button" onClick={() => router.push("/loja/carrinho")} className="text-center text-sm font-medium text-primary hover:underline">
          Ver carrinho →
        </button>
      )}
    </div>
  );
}
