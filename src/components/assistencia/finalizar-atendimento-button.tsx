"use client";

import { useState } from "react";
import { CheckCircle2, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { finalizarAtendimentoOSAction } from "@/services/assistencia/assistencia.actions";
import { formatCurrency } from "@/utils";

export function FinalizarAtendimentoButton({ osId, garantiaAtual }: { osId: string; garantiaAtual: number | null }) {
  const [aberto, setAberto] = useState(false);
  const [formaPagamento, setFormaPagamento] = useState("pix");
  const [parcelas, setParcelas] = useState("1");
  const [valor, setValor] = useState("");
  const [garantiaDias, setGarantiaDias] = useState(garantiaAtual ? String(garantiaAtual) : "90");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pagamentosMisto, setPagamentosMisto] = useState<{ metodo: string; valor: string }[]>([
    { metodo: "dinheiro", valor: "" }, { metodo: "pix", valor: "" },
  ]);

  async function handleFinalizar() {
    if (!valor || Number(valor) <= 0) return setErro("Informa o valor cobrado");
    if (!garantiaDias || Number(garantiaDias) < 0) return setErro("Define a garantia — não dá pra finalizar sem isso");

    let pagamentosParaEnviar: { metodo: string; valor: number }[] | undefined;
    if (formaPagamento === "misto") {
      const linhasPreenchidas = pagamentosMisto.filter((p) => Number(p.valor) > 0);
      if (linhasPreenchidas.length < 2) return setErro("Pagamento misto precisa de pelo menos 2 formas com valor preenchido");
      const soma = linhasPreenchidas.reduce((acc, p) => acc + Number(p.valor), 0);
      if (Math.abs(soma - Number(valor)) > 0.01) return setErro(`A soma dos pagamentos (${formatCurrency(soma)}) não bate com o valor cobrado (${formatCurrency(Number(valor))})`);
      pagamentosParaEnviar = linhasPreenchidas.map((p) => ({ metodo: p.metodo, valor: Number(p.valor) }));
    }

    setSalvando(true);
    setErro(null);
    const formaFinal = formaPagamento === "cartao_credito" ? `cartao_credito_${parcelas}x` : formaPagamento;
    const result = await finalizarAtendimentoOSAction(osId, formaFinal, Number(valor), Number(garantiaDias), pagamentosParaEnviar);
    setSalvando(false);
    if (!result.success) return setErro(result.error);

    // Já dispara a impressão do comprovante, sem precisar clicar em mais nada.
    window.open(`/impressao/os/${osId}?formato=a4`, "_blank");
    setAberto(false);
  }

  if (!aberto) {
    return (
      <Button type="button" onClick={() => setAberto(true)} className="gap-1.5">
        <CheckCircle2 className="h-4 w-4" />Finalizar atendimento
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-white p-3">
      <p className="text-xs font-medium text-foreground">Finalizar atendimento</p>

      <div className="grid grid-cols-2 gap-2">
        <Select value={formaPagamento} onValueChange={setFormaPagamento}>
          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pix">Pix</SelectItem>
            <SelectItem value="cartao_credito">Cartão de crédito</SelectItem>
            <SelectItem value="cartao_debito">Cartão de débito</SelectItem>
            <SelectItem value="dinheiro">Dinheiro</SelectItem>
            <SelectItem value="misto">Misto</SelectItem>
          </SelectContent>
        </Select>
        <Input type="number" placeholder="Valor cobrado (R$)" value={valor} onChange={(e) => setValor(e.target.value)} className="h-9 text-xs" />
      </div>

      {formaPagamento === "misto" && (
        <div className="flex flex-col gap-2 rounded-lg border border-border p-2.5">
          <p className="text-[11px] font-medium text-muted-foreground">Detalha quanto foi em cada forma — a soma precisa bater com o valor cobrado</p>
          {pagamentosMisto.map((p, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <Select value={p.metodo} onValueChange={(v) => setPagamentosMisto((prev) => prev.map((item, idx) => idx === i ? { ...item, metodo: v } : item))}>
                <SelectTrigger className="h-8 flex-1 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">Pix</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="cartao_credito">Crédito</SelectItem>
                  <SelectItem value="cartao_debito">Débito</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number" step="0.01" placeholder="Valor" value={p.valor}
                onChange={(e) => setPagamentosMisto((prev) => prev.map((item, idx) => idx === i ? { ...item, valor: e.target.value } : item))}
                className="h-8 w-24 text-xs"
              />
              {pagamentosMisto.length > 2 && (
                <button type="button" onClick={() => setPagamentosMisto((prev) => prev.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-danger">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setPagamentosMisto((prev) => [...prev, { metodo: "cartao_credito", valor: "" }])}
            className="flex items-center gap-1 text-[11px] text-primary hover:underline"
          >
            <Plus className="h-3 w-3" />Adicionar forma
          </button>
          {(() => {
            const soma = pagamentosMisto.reduce((acc, p) => acc + (Number(p.valor) || 0), 0);
            const bateComTotal = valor ? Math.abs(soma - Number(valor)) <= 0.01 : false;
            return <p className={cn("text-[11px] font-medium", bateComTotal ? "text-success-text" : "text-warning-text")}>Soma: {formatCurrency(soma)} {bateComTotal ? "✓" : valor ? `(falta ${formatCurrency(Number(valor) - soma)})` : ""}</p>;
          })()}
        </div>
      )}

      {formaPagamento === "cartao_credito" && (
        <Select value={parcelas} onValueChange={setParcelas}>
          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Quantas vezes" /></SelectTrigger>
          <SelectContent>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
              <SelectItem key={n} value={String(n)}>{n}x{n === 1 ? " (à vista)" : ""}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div>
        <label className="text-[11px] text-muted-foreground">Garantia (dias) — obrigatório pra finalizar</label>
        <Input type="number" placeholder="Ex: 90" value={garantiaDias} onChange={(e) => setGarantiaDias(e.target.value)} className="h-9 text-xs" />
      </div>

      {erro && <p className="text-[11px] text-danger">{erro}</p>}
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={handleFinalizar} disabled={salvando}>
          {salvando ? "Finalizando..." : "Confirmar e imprimir"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setAberto(false)}>Cancelar</Button>
      </div>
    </div>
  );
}
