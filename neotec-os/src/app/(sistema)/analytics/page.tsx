import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obterResumoAnalytics } from "@/services/analytics/analytics.service";
import { FaturamentoChart } from "@/components/analytics/faturamento-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { podeVerCusto } from "@/utils/permissions";
import { formatCurrency } from "@/utils";
import type { CargoUsuario } from "@/types";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: perfil } = await supabase
    .from("usuarios").select("cargo").eq("id", user?.id ?? "").single<{ cargo: CargoUsuario }>();

  // Analytics expõe lucro agregado — mesma regra de quem vê lucro em Vendas.
  if (!perfil || !podeVerCusto(perfil.cargo)) redirect("/dashboard");

  const resumo = await obterResumoAnalytics(30);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground">Últimos 30 dias</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Faturamento</p><p className="font-display text-xl font-semibold">{formatCurrency(resumo.faturamentoTotal)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Lucro</p><p className="font-display text-xl font-semibold">{formatCurrency(resumo.lucroTotal)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Vendas</p><p className="font-display text-xl font-semibold">{resumo.vendasTotal}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Faturamento por dia</CardTitle></CardHeader>
        <CardContent><FaturamentoChart dados={resumo.faturamentoPorDia} /></CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Desempenho por vendedor</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2">
            {resumo.vendedores.map((v) => (
              <div key={v.usuario_id} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{v.nome}</span>
                <span className="text-muted-foreground">{v.vendas} vendas · {formatCurrency(v.faturamento)}</span>
              </div>
            ))}
            {resumo.vendedores.length === 0 && <p className="text-sm text-muted-foreground">Sem dados no período.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Desempenho por técnico</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2">
            {resumo.tecnicos.map((t) => (
              <div key={t.usuario_id} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{t.nome}</span>
                <span className="text-muted-foreground">{t.osEntregues} OS entregues</span>
              </div>
            ))}
            {resumo.tecnicos.length === 0 && <p className="text-sm text-muted-foreground">Sem dados no período.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
