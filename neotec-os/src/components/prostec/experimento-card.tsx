"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { encerrarExperimentoProstecAction } from "@/services/prostec/prostec.actions";

interface Variante { id: string; nome: string; texto_mensagem: string; enviadas: number; respondidas: number; interessadas: number; vendidas: number }
interface Experimento { id: string; nome: string; status: string; amostra_minima: number; variante_vencedora: string | null; variantes: Variante[] }

export function ExperimentoCard({ experimento }: { experimento: Experimento }) {
  const [isPending, startTransition] = useTransition();
  const totalEnviadas = experimento.variantes.reduce((acc, v) => acc + v.enviadas, 0);

  function handleEncerrar() {
    startTransition(() => { void encerrarExperimentoProstecAction(experimento.id); });
  }

  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">{experimento.nome}</p>
          <p className="text-xs text-muted-foreground">
            {experimento.status === "ativo" ? "🟢 Ativo" : experimento.status === "concluido" ? "✅ Concluído" : experimento.status}
            {" · "}{totalEnviadas}/{experimento.amostra_minima} envios pra amostra mínima
          </p>
        </div>
        {experimento.status === "ativo" && <Button type="button" size="sm" variant="outline" onClick={handleEncerrar} disabled={isPending}>Encerrar</Button>}
      </div>

      {experimento.variante_vencedora && (
        <p className="mb-2 rounded-lg bg-success/10 p-2 text-xs font-medium text-success-text">🏆 Variante vencedora: {experimento.variante_vencedora}</p>
      )}
      {experimento.status === "concluido" && !experimento.variante_vencedora && (
        <p className="mb-2 rounded-lg bg-warning-soft p-2 text-xs text-warning-text">Amostra insuficiente pra declarar vencedor com confiança — resultado inconclusivo.</p>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {experimento.variantes.map((v) => {
          const taxaResposta = v.enviadas > 0 ? Math.round((v.respondidas / v.enviadas) * 100) : 0;
          const taxaVenda = v.enviadas > 0 ? Math.round((v.vendidas / v.enviadas) * 100) : 0;
          return (
            <div key={v.id} className="rounded-xl bg-secondary/40 p-3 text-xs">
              <p className="mb-1 font-semibold text-foreground">Variante {v.nome}</p>
              <p className="mb-2 text-muted-foreground">{v.texto_mensagem}</p>
              <div className="flex justify-between text-muted-foreground">
                <span>Enviadas: {v.enviadas}</span>
                <span>Resposta: {taxaResposta}%</span>
                <span>Venda: {taxaVenda}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
