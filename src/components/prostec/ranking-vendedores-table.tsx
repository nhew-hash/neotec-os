"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { definirMetaVendedorAction } from "@/services/prostec/prostec.actions";
import { formatCurrency } from "@/utils";
import type { RankingVendedor } from "@/services/prostec/prostec.service";

export function RankingVendedoresTable({ ranking }: { ranking: RankingVendedor[] }) {
  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-black/[0.06] text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <th className="p-3 font-medium">Vendedor</th>
            <th className="p-3 text-right font-medium">Meta do mês</th>
            <th className="p-3 text-right font-medium">Faturamento</th>
            <th className="p-3 font-medium">Progresso</th>
          </tr>
        </thead>
        <tbody>
          {ranking.map((v) => <LinhaVendedor key={v.usuario_id} vendedor={v} />)}
        </tbody>
      </table>
    </div>
  );
}

function LinhaVendedor({ vendedor }: { vendedor: RankingVendedor }) {
  const [editando, setEditando] = useState(false);
  const [novaMeta, setNovaMeta] = useState(String(vendedor.metaMes || ""));
  const [salvando, setSalvando] = useState(false);

  async function handleSalvar() {
    setSalvando(true);
    await definirMetaVendedorAction(vendedor.usuario_id, Number(novaMeta));
    setSalvando(false);
    setEditando(false);
  }

  return (
    <tr className="border-b border-black/[0.04] last:border-0">
      <td className="p-3 font-medium text-foreground">{vendedor.nome}</td>
      <td className="p-3 text-right">
        {editando ? (
          <div className="flex items-center justify-end gap-1.5">
            <Input type="number" value={novaMeta} onChange={(e) => setNovaMeta(e.target.value)} className="h-7 w-24 text-xs" />
            <Button type="button" size="sm" onClick={handleSalvar} disabled={salvando} className="h-7 px-2 text-xs">Ok</Button>
          </div>
        ) : (
          <button type="button" onClick={() => setEditando(true)} className="text-muted-foreground hover:text-primary hover:underline">
            {vendedor.metaMes > 0 ? formatCurrency(vendedor.metaMes) : "Definir meta"}
          </button>
        )}
      </td>
      <td className="p-3 text-right font-semibold text-success">{formatCurrency(vendedor.faturamentoMes)}</td>
      <td className="p-3">
        <div className="flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, vendedor.progressoPct)}%` }} />
          </div>
          <span className="w-10 shrink-0 text-xs text-muted-foreground">{vendedor.progressoPct}%</span>
        </div>
      </td>
    </tr>
  );
}
