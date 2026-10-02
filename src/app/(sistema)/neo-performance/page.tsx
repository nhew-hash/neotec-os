import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { obterResumoDashboard, obterDesempenhoPorCampanha } from "@/services/neo-performance/financeiro-performance.service";
import { listarDiagnosticos } from "@/services/neo-performance/diagnostico.service";
import { obterOportunidadesEstoque } from "@/services/neo-performance/product-performance.service";
import { gerarRelatorioDiario } from "@/services/neo-performance/daily-report.service";
import { obterAlertas } from "@/services/neo-performance/alertas.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { podeVerCusto } from "@/utils/permissions";
import { formatCurrency } from "@/utils";
import { RodarDiagnosticoButton } from "@/components/neo-performance/rodar-diagnostico-button";
import type { CargoUsuario } from "@/types";

export default async function NeoPerformancePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: perfil } = await supabase
    .from("usuarios").select("cargo").eq("id", user?.id ?? "").single<{ cargo: CargoUsuario }>();

  // Investimento, CAC, margem e lucro são dado financeiro — mesma regra de quem vê custo em Vendas/Analytics.
  if (!perfil || !podeVerCusto(perfil.cargo)) redirect("/dashboard");

  const [resumo, campanhas, diagnosticos, oportunidadesEstoque, relatorioHoje, alertas] = await Promise.all([
    obterResumoDashboard(),
    obterDesempenhoPorCampanha(30),
    listarDiagnosticos("aberto"),
    obterOportunidadesEstoque(30),
    gerarRelatorioDiario(),
    obterAlertas(),
  ]);

  const limiteMensalUsado = resumo.limites.mensal ? (resumo.investimento.mes / resumo.limites.mensal) * 100 : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">NEO Performance</h1>
          <p className="text-sm text-muted-foreground">Fase 1 — fundação, atribuição e cérebro analítico. Últimos 30 dias.</p>
        </div>
        <div className="flex items-center gap-2">
          <RodarDiagnosticoButton />
          <Link href="/neo-performance/configuracoes"><Button variant="outline" size="sm">Configurações</Button></Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link href="/neo-performance/inteligencia" className="text-primary hover:underline">Central de Inteligência</Link>
        <span className="text-muted-foreground">·</span>
        <Link href="/neo-performance/creative-factory" className="text-primary hover:underline">Creative Factory + Test Lab</Link>
        <span className="text-muted-foreground">·</span>
        <Link href="/neo-performance/automacao" className="text-primary hover:underline">Automation Engine</Link>
        <span className="text-muted-foreground">·</span>
        <Link href="/neo-performance/system-health" className="text-primary hover:underline">System Health</Link>
        <span className="text-muted-foreground">·</span>
        <Link href="/neo-performance/oportunidades" className="text-primary hover:underline">Oportunidades</Link>
      </div>

      {alertas.length > 0 && (
        <Card className="border-warning">
          <CardHeader><CardTitle>Alertas</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-1">
            {alertas.map((a, i) => (
              <p key={i} className="text-sm text-foreground">
                <span className="mr-2 text-xs uppercase text-muted-foreground">{a.categoria}</span>{a.mensagem}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {campanhas.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-4 text-sm text-muted-foreground">
            Nenhuma campanha conectada ainda. As métricas abaixo ficam zeradas até você conectar uma conta de Meta/Google Ads em{" "}
            <Link href="/neo-performance/configuracoes" className="font-medium text-primary hover:underline">Configurações</Link>.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Investimento (mês)" value={formatCurrency(resumo.investimento.mes)} sub={limiteMensalUsado != null ? `${limiteMensalUsado.toFixed(0)}% do limite` : undefined} />
        <MetricCard label="Faturamento (30d)" value={formatCurrency(resumo.faturamento)} />
        <MetricCard label="Margem (30d)" value={formatCurrency(resumo.margem)} />
        <MetricCard label="Lucro estimado" value={formatCurrency(resumo.lucroEstimado)} />
        <MetricCard label="CAC" value={resumo.cac != null ? formatCurrency(resumo.cac) : "—"} />
        <MetricCard label="ROAS" value={resumo.roas != null ? `${resumo.roas.toFixed(2)}x` : "—"} />
        <MetricCard label="Leads (30d)" value={String(resumo.leads)} />
        <MetricCard label="Vendas (30d)" value={String(resumo.vendas)} />
      </div>

      <Card>
        <CardHeader><CardTitle>Desempenho por campanha</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-2">
          {campanhas.map((c) => (
            <div key={c.campanha_id} className="flex items-center justify-between border-b border-border py-2 text-sm last:border-0">
              <span className="font-medium text-foreground">{c.nome}</span>
              <span className="text-muted-foreground">
                {formatCurrency(c.gasto)} gastos · {c.leads} leads · {c.compras} compras
                {c.cac != null && ` · CAC ${formatCurrency(c.cac)}`}
                {c.roas != null && ` · ROAS ${c.roas.toFixed(2)}x`}
              </span>
            </div>
          ))}
          {campanhas.length === 0 && <p className="text-sm text-muted-foreground">Sem campanhas cadastradas.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Diagnósticos abertos</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-2">
          {diagnosticos.map((d) => (
            <div key={d.id} className="flex items-start gap-2 border-b border-border py-2 text-sm last:border-0">
              <StatusBadge
                label={d.severidade === "critico" ? "Crítico" : d.severidade === "atencao" ? "Atenção" : "Info"}
                tone={d.severidade === "critico" ? "danger" : d.severidade === "atencao" ? "warning" : "info"}
              />
              <p className="text-foreground">{d.mensagem}</p>
            </div>
          ))}
          {diagnosticos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum diagnóstico em aberto. Use &quot;Rodar diagnóstico&quot; pra analisar de novo.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Oportunidades de estoque</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-2">
          {oportunidadesEstoque.map((o) => (
            <div key={o.produto_id} className="flex items-start gap-2 border-b border-border py-2 text-sm last:border-0">
              <StatusBadge
                label={o.tipo === "estoque_baixo" ? "Estoque baixo" : o.tipo === "estoque_parado" ? "Parado" : "Oportunidade"}
                tone={o.tipo === "estoque_baixo" ? "warning" : o.tipo === "estoque_parado" ? "neutral" : "success"}
              />
              <div>
                <p className="text-foreground">{o.nome} <span className="text-muted-foreground">({o.estoque} em estoque)</span></p>
                <p className="text-xs text-muted-foreground">{o.sugestao}</p>
              </div>
            </div>
          ))}
          {oportunidadesEstoque.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma oportunidade/risco de estoque identificado.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Daily Performance Report — hoje</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p className="text-foreground">
            Investimento {formatCurrency(relatorioHoje.investimento)} · {relatorioHoje.leads} leads · {relatorioHoje.vendas} vendas ·
            {" "}faturamento {formatCurrency(relatorioHoje.faturamento)} · lucro após aquisição {formatCurrency(relatorioHoje.lucroAposAquisicao)}
          </p>
          {relatorioHoje.problemas.length > 0 && <p className="text-danger">🔴 {relatorioHoje.problemas.join(" · ")}</p>}
          {relatorioHoje.atencao.length > 0 && <p className="text-warning">🟡 {relatorioHoje.atencao.join(" · ")}</p>}
          {relatorioHoje.funcionando.length > 0 && <p className="text-success">🟢 {relatorioHoje.funcionando.join(" · ")}</p>}
          {relatorioHoje.acoesExecutadas.length > 0 && <p className="text-muted-foreground">🤖 {relatorioHoje.acoesExecutadas.join(" · ")}</p>}
          {relatorioHoje.testesAtivos.length > 0 && <p className="text-muted-foreground">🧪 {relatorioHoje.testesAtivos.join(" · ")}</p>}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-display text-lg font-semibold text-foreground">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}
