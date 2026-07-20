"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatCurrency } from "@/utils";
import type { PontoDesempenhoEquipe } from "@/services/dashboard/dashboard-graficos.service";

export function RelatorioDesempenhoChart({ dados }: { dados: PontoDesempenhoEquipe[] }) {
  if (dados.length === 0) {
    return <p className="flex h-full items-center justify-center text-sm text-muted-foreground">Nenhuma venda no período.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={dados}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="usuario" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 11 }} width={80} />
        <Tooltip formatter={(v: number) => formatCurrency(v)} />
        <Bar dataKey="faturamento" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
