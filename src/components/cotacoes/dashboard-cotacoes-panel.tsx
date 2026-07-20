"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/utils";
import type { DashboardCotacoes } from "@/services/cotacoes/cotacoes-dashboard.service";

export function DashboardCotacoesPanel({ dados }: { dados: DashboardCotacoes }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex flex-col gap-1 p-4">
            <span className="text-xs text-muted-foreground">Última importação</span>
            <span className="text-sm font-medium text-foreground">
              {dados.ultimaImportacao ? dados.ultimaImportacao.fornecedor : "—"}
            </span>
            {dados.ultimaImportacao && (
              <span className="text-xs text-muted-foreground">
                {formatDate(dados.ultimaImportacao.data)} · {dados.ultimaImportacao.quantidade} aparelho(s)
              </span>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1 p-4">
            <span className="text-xs text-muted-foreground">Cotações ativas</span>
            <span className="font-display text-lg font-semibold text-foreground">{dados.totalCotacoesAtivas}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1 p-4">
            <span className="text-xs text-muted-foreground">Preço médio geral</span>
            <span className="font-display text-lg font-semibold text-foreground">
              {dados.precoMedioGeral != null ? formatCurrency(dados.precoMedioGeral) : "—"}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1 p-4">
            <span className="text-xs text-muted-foreground">Categorias com cotação</span>
            <span className="font-display text-lg font-semibold text-foreground">{dados.quantidadePorCategoria.length}</span>
          </CardContent>
        </Card>
      </div>

      {dados.quantidadePorCategoria.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Aparelhos por categoria</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {dados.quantidadePorCategoria.map((c) => (
              <div key={c.categoria} className="rounded-md border border-border px-3 py-2 text-sm">
                <span className="font-medium text-foreground">{c.quantidade}</span>
                <span className="ml-1.5 text-muted-foreground">{c.categoria}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {dados.evolucaoPrecoMedio.length > 1 && (
        <Card>
          <CardHeader><CardTitle>Evolução do preço médio</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dados.evolucaoPrecoMedio}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="data" tickFormatter={(v) => formatDate(v)} className="text-xs" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => formatCurrency(v)} className="text-xs" tick={{ fontSize: 11 }} width={80} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={(v) => formatDate(v)} />
                <Line type="monotone" dataKey="precoMedio" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
