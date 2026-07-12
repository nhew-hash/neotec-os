"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatCurrency, formatDate } from "@/utils";
import type { FaturamentoPorDia } from "@/services/analytics/analytics.service";

export function FaturamentoChart({ dados }: { dados: FaturamentoPorDia[] }) {
  if (dados.length === 0) {
    return <p className="py-12 text-center text-sm text-muted-foreground">Sem vendas no período.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={dados}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="data" tickFormatter={(d) => formatDate(d)} fontSize={11} stroke="hsl(var(--muted-foreground))" />
        <YAxis tickFormatter={(v) => formatCurrency(v)} fontSize={11} width={90} stroke="hsl(var(--muted-foreground))" />
        <Tooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={(d) => formatDate(d as string)} />
        <Line type="monotone" dataKey="valor" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
