"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { finalizarAtendimentoOSAction } from "@/services/assistencia/assistencia.actions";

export function FinalizarAtendimentoButton({ osId }: { osId: string }) {
  const [aberto, setAberto] = useState(false);
  const [formaPagamento, setFormaPagamento] = useState("pix");
  const [valor, setValor] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleFinalizar() {
    if (!valor || Number(valor) <= 0) return setErro("Informa o valor cobrado");
    setSalvando(true);
    setErro(null);
    const result = await finalizarAtendimentoOSAction(osId, formaPagamento, Number(valor));
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
          </SelectContent>
        </Select>
        <Input type="number" placeholder="Valor cobrado (R$)" value={valor} onChange={(e) => setValor(e.target.value)} className="h-9 text-xs" />
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
