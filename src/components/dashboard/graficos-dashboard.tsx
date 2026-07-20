"use client";

import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/utils";
import type {
  PontoVendasPeriodo, PontoOrigemCliente, PontoFunilCRM, PontoDesempenhoEquipe,
} from "@/services/dashboard/dashboard-graficos.service";

const CORES_ORIGEM = ["#2643D6", "#4CA9D9", "#16A34A", "#D97706", "#E4572E", "#8A90A0"];

interface GraficosDashboardProps {
  vendasPorPeriodo: PontoVendasPeriodo[];
  origemClientes: PontoOrigemCliente[];
  funilCRM: PontoFunilCRM[];
  desempenhoEquipe: PontoDesempenhoEquipe[];
}

export function GraficosDashboard({ vendasPorPeriodo, origemClientes, funilCRM, desempenhoEquipe }: GraficosDashboardProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Vendas por período</CardTitle></CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={vendasPorPeriodo}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="data" tickFormatter={(v) => formatDate(v)} tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 11 }} width={80} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={(v) => formatDate(v)} />
              <Line type="monotone" dataKey="valor" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Origem dos clientes</CardTitle></CardHeader>
        <CardContent className="h-64">
          {origemClientes.length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-muted-foreground">Sem dados de origem ainda.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={origemClientes} dataKey="quantidade" nameKey="origem" cx="50%" cy="50%" outerRadius={80} label>
                  {origemClientes.map((_, i) => <Cell key={i} fill={CORES_ORIGEM[i % CORES_ORIGEM.length]} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Funil do CRM</CardTitle></CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funilCRM} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="etapa" tick={{ fontSize: 11 }} width={110} />
              <Tooltip />
              <Bar dataKey="quantidade" radius={[0, 4, 4, 0]}>
                {funilCRM.map((etapa, i) => <Cell key={i} fill={etapa.cor} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Desempenho da equipe (30 dias)</CardTitle></CardHeader>
        <CardContent className="h-64">
          {desempenhoEquipe.length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-muted-foreground">Nenhuma venda no período.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={desempenhoEquipe}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="usuario" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 11 }} width={80} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="faturamento" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
