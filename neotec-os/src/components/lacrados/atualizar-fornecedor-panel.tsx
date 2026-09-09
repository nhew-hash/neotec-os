"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Check, X, AlertTriangle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { interpretarTabelaFornecedorAction, aplicarAtualizacaoLacradosAction } from "@/services/lacrados/lacrados.actions";
import { formatCurrency } from "@/utils";
import type { ItemTabelaFornecedor } from "@/services/lacrados/lacrados-ia.service";

export function AtualizarFornecedorPanel() {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [itens, setItens] = useState<ItemTabelaFornecedor[] | null>(null);
  const [interpretando, setInterpretando] = useState(false);
  const [aplicando, startAplicar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());

  async function handleInterpretar() {
    setErro(null);
    setInterpretando(true);
    const result = await interpretarTabelaFornecedorAction(texto);
    setInterpretando(false);

    if (!result.success) return setErro(result.error);
    setItens(result.data.itens);
    // Pré-seleciona só os que encontraram correspondência — os sem match precisam de olho humano antes.
    setSelecionados(new Set(result.data.itens.map((item, i) => (item.varianteId ? i : -1)).filter((i) => i >= 0)));
  }

  function handleAplicar() {
    if (!itens) return;
    const paraAplicar = itens
      .filter((_, i) => selecionados.has(i))
      .filter((item) => item.varianteId)
      .map((item) => ({ varianteId: item.varianteId!, preco: item.preco }));

    if (paraAplicar.length === 0) return;

    startAplicar(async () => {
      const result = await aplicarAtualizacaoLacradosAction(paraAplicar);
      if (!result.success) return setErro(result.error);
      setItens(null);
      setTexto("");
      router.refresh();
    });
  }

  function alternarSelecao(index: number) {
    setSelecionados((prev) => {
      const novo = new Set(prev);
      if (novo.has(index)) novo.delete(index);
      else novo.add(index);
      return novo;
    });
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4">
        <div>
          <p className="text-sm font-medium text-foreground">Cole a tabela do fornecedor</p>
          <p className="text-xs text-muted-foreground">Cola o texto igual chegou no WhatsApp — a IA identifica modelo, cor, armazenamento e preço, e casa com o catálogo mestre.</p>
        </div>

        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={"Ex:\n17 Pro Max 256GB Preto - R$ 7.099\n17 Pro Max 256GB Branco - R$ 7.149\niPhone 13 128gb azul r$ 2800"}
          rows={6}
        />

        {erro && <p className="text-xs text-danger">{erro}</p>}

        <Button onClick={handleInterpretar} disabled={interpretando || !texto.trim()} className="w-fit">
          <Sparkles className="h-4 w-4" />{interpretando ? "Interpretando..." : "Interpretar com IA"}
        </Button>

        {itens && (
          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <p className="text-xs font-medium text-muted-foreground">
              {itens.length} linha(s) reconhecida(s) — confira antes de aplicar. Linha sem correspondência não pode ser aplicada.
            </p>
            {itens.map((item, i) => (
              <label
                key={i}
                className={`flex items-center gap-3 rounded-md border p-2.5 text-xs ${item.varianteId ? "border-border cursor-pointer" : "border-warning/40 bg-warning-soft"}`}
              >
                <input
                  type="checkbox"
                  checked={selecionados.has(i)}
                  disabled={!item.varianteId}
                  onChange={() => alternarSelecao(i)}
                  className="h-4 w-4 accent-primary"
                />
                <div className="flex-1">
                  <span className="font-medium text-foreground">{item.modeloDetectado}</span> — {item.armazenamento} · {item.cor} — {formatCurrency(item.preco)}
                  {!item.varianteId && (
                    <span className="ml-2 flex items-center gap-1 text-warning"><AlertTriangle className="h-3 w-3" />Não encontrado no catálogo mestre</span>
                  )}
                  {item.varianteId && <Check className="ml-2 inline h-3 w-3 text-success" />}
                </div>
              </label>
            ))}

            <div className="flex gap-2 pt-2">
              <Button onClick={handleAplicar} disabled={aplicando || selecionados.size === 0}>
                {aplicando ? "Aplicando..." : `Aplicar ${selecionados.size} atualização(ões)`}
              </Button>
              <Button variant="ghost" onClick={() => setItens(null)}>
                <X className="h-4 w-4" />Cancelar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
