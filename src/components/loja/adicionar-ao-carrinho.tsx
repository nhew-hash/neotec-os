"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ShoppingBag, MapPin, Truck, BatteryFull, ShieldCheck } from "lucide-react";
import { useCarrinho } from "./carrinho-context";
import { formatCurrency } from "@/utils";
import { DestaquePrecoCliente } from "./destaque-preco-cliente";
import type { ProdutoLoja, AparelhoDisponivelLoja } from "@/types";

const LABEL_CONDICAO: Record<string, string> = { novo: "Novo", seminovo: "Seminovo", usado: "Usado" };
const LABEL_PECA: Record<string, string> = { tela: "Tela", bateria: "Bateria", carcaca: "Carcaça" };

function corBateria(bateria: number): string {
  if (bateria >= 85) return "text-success";
  if (bateria >= 70) return "text-warning";
  return "text-danger";
}

interface AdicionarAoCarrinhoProps {
  produto: ProdutoLoja;
  aparelhosDisponiveis: AparelhoDisponivelLoja[];
  pixDescontoPercentual?: number;
  onAparelhoChange?: (aparelhoId: string | null) => void;
}

export function AdicionarAoCarrinho({ produto, aparelhosDisponiveis, pixDescontoPercentual = 0, onAparelhoChange }: AdicionarAoCarrinhoProps) {
  const router = useRouter();
  const { adicionar } = useCarrinho();
  const [aparelhoSelecionadoId, setAparelhoSelecionadoId] = useState<string | null>(aparelhosDisponiveis[0]?.id ?? null);
  const [adicionado, setAdicionado] = useState(false);

  function handleSelecionarAparelho(id: string) {
    setAparelhoSelecionadoId(id);
    onAparelhoChange?.(id);
  }

  const temVariantes = aparelhosDisponiveis.length > 0;
  const aparelhoSelecionado = aparelhosDisponiveis.find((a) => a.id === aparelhoSelecionadoId);
  const precoExibido = temVariantes ? aparelhoSelecionado?.preco_venda ?? produto.preco_venda : produto.preco_venda;
  const disponivel = !temVariantes || aparelhosDisponiveis.length > 0;

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

  return (
    <div className="flex flex-col gap-5">
      {precoExibido != null && (
        <div className="flex flex-col gap-1.5">
          <DestaquePrecoCliente precoVenda={precoExibido} precoLiquidoDesejado={null} produtoId={produto.id} aparelhoId={aparelhoSelecionadoId ?? undefined} />
        </div>
      )}

      {disponivel && (
        <span className="flex w-fit items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
          🏪 Retire agora na loja
        </span>
      )}

      {temVariantes && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Escolha a unidade</span>
          <div className="flex flex-col gap-2">
            {aparelhosDisponiveis.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => handleSelecionarAparelho(a.id)}
                className={`flex items-center justify-between rounded-xl border p-3 text-left transition-colors ${
                  aparelhoSelecionadoId === a.id ? "border-primary bg-primary/5" : "border-black/[0.08] hover:border-black/20"
                }`}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm text-foreground">{[a.memoria, a.cor, LABEL_CONDICAO[a.condicao]].filter(Boolean).join(" · ")}</span>
                  {a.condicao !== "novo" && a.bateria != null && (
                    <span className={`flex items-center gap-1 text-xs font-medium ${corBateria(a.bateria)}`}>
                      <BatteryFull className="h-3.5 w-3.5" />Saúde da bateria: {a.bateria}%
                    </span>
                  )}
                  {a.pecas_substituidas.length > 0 ? (
                    <span className="text-[11px] text-muted-foreground">Peças trocadas: {a.pecas_substituidas.map((p) => LABEL_PECA[p] ?? p).join(", ")}</span>
                  ) : (
                    a.condicao !== "novo" && <span className="text-[11px] text-muted-foreground">Nenhuma peça substituída</span>
                  )}
                  {a.observacoes && <span className="text-[11px] italic text-muted-foreground">{a.observacoes}</span>}
                </div>
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

      <div className="flex flex-col gap-2.5 rounded-2xl bg-[#FAFBFC] p-4">
        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-xs text-foreground">Retire na loja em Araguari, ou combine entrega direto pelo WhatsApp na hora de fechar.</p>
        </div>
        <div className="flex items-start gap-3">
          <Truck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-xs text-foreground">Entrega combinada com a equipe — valor e prazo variam conforme a região.</p>
        </div>
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-xs text-foreground">Garantia Neotec — todo aparelho passa por checklist completo antes de sair da loja.</p>
        </div>
      </div>
    </div>
  );
}
