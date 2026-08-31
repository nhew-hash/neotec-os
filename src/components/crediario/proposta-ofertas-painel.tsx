"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calcularOfertasAction, selecionarOfertaAction } from "@/services/crediario/crediario.actions";
import { formatCurrency } from "@/utils";

interface Oferta {
  id: string; produto_nome: string; frequencia_pagamento: string; valor_entrada: number;
  numero_pagamentos: number; valor_pagamento: number; valor_total_contratado: number;
  status: string; motivo_indisponivel: string | null; selecionada: boolean;
}

const LABEL_FREQ: Record<string, string> = { diaria: "Diária", semanal: "Semanal", quinzenal: "Quinzenal", mensal: "Mensal" };

export function PropostaOfertasPainel({ propostaId, ofertas, frequenciasPermitidas }: { propostaId: string; ofertas: Oferta[]; frequenciasPermitidas: string[] }) {
  const [isPending, startTransition] = useTransition();
  const [entradaDisponivel, setEntradaDisponivel] = useState("");
  const [frequencia, setFrequencia] = useState(frequenciasPermitidas[0] ?? "mensal");

  function handleCalcular() {
    if (!entradaDisponivel) return;
    startTransition(() => { void calcularOfertasAction(propostaId, Number(entradaDisponivel), frequencia as "diaria" | "semanal" | "quinzenal" | "mensal"); });
  }

  function handleSelecionar(ofertaId: string) {
    startTransition(() => { void selecionarOfertaAction(ofertaId); });
  }

  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-foreground">Ofertas disponíveis</h2>

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Entrada disponível (R$)</label>
          <Input type="number" value={entradaDisponivel} onChange={(e) => setEntradaDisponivel(e.target.value)} className="mt-1 w-40" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Frequência</label>
          <Select value={frequencia} onValueChange={setFrequencia}>
            <SelectTrigger className="mt-1 w-40"><SelectValue /></SelectTrigger>
            <SelectContent>{frequenciasPermitidas.map((f) => <SelectItem key={f} value={f}>{LABEL_FREQ[f] ?? f}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Button type="button" onClick={handleCalcular} disabled={isPending || !entradaDisponivel}>{isPending ? "Calculando..." : "Calcular"}</Button>
      </div>

      {ofertas.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">Informa a entrada disponível e clica em calcular pra ver as opções.</p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ofertas.map((o) => (
            <div key={o.id} className={`rounded-xl border p-3 text-xs ${o.selecionada ? "border-primary bg-primary/5" : "border-black/[0.08]"}`}>
              <div className="mb-1 flex items-center justify-between">
                <p className="font-semibold text-foreground">{o.produto_nome}</p>
                {o.status === "aprovado" && <CheckCircle2 className="h-4 w-4 text-success" />}
                {o.status === "entrada_maior" && <AlertTriangle className="h-4 w-4 text-warning" />}
                {o.status === "nao_disponivel" && <XCircle className="h-4 w-4 text-danger" />}
              </div>

              {o.status === "aprovado" && (
                <>
                  <p className="text-muted-foreground">Entrada: {formatCurrency(o.valor_entrada)}</p>
                  <p className="text-muted-foreground">{o.numero_pagamentos}x {formatCurrency(o.valor_pagamento)} ({LABEL_FREQ[o.frequencia_pagamento]})</p>
                  <p className="mt-1 font-medium text-foreground">Total: {formatCurrency(o.valor_total_contratado)}</p>
                  <Button type="button" size="sm" variant={o.selecionada ? "default" : "outline"} onClick={() => handleSelecionar(o.id)} disabled={isPending} className="mt-2 w-full">
                    {o.selecionada ? "Selecionada ✓" : "Selecionar"}
                  </Button>
                </>
              )}
              {o.status === "entrada_maior" && <p className="text-warning-text">Precisa de entrada mínima de {formatCurrency(o.valor_entrada)}</p>}
              {o.status === "nao_disponivel" && <p className="text-danger">{o.motivo_indisponivel}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
