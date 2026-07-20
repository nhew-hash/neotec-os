import { obterRelatorioCRM } from "@/services/crm-pipeline/crm-relatorios.service";
import { obterDesempenhoEquipe } from "@/services/dashboard/dashboard-graficos.service";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RelatorioDesempenhoChart } from "@/components/crm/relatorio-desempenho-chart";

export default async function RelatoriosCRMPage() {
  const [relatorio, desempenhoEquipe] = await Promise.all([obterRelatorioCRM(), obterDesempenhoEquipe()]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Relatórios do CRM" description="Conversão, tempo até fechar, motivos de perda, recuperação pela IA" />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <Card><CardContent className="flex flex-col gap-1 p-4">
          <span className="text-xs text-muted-foreground">Total de leads</span>
          <span className="font-display text-xl font-semibold text-foreground">{relatorio.totalLeads}</span>
        </CardContent></Card>
        <Card><CardContent className="flex flex-col gap-1 p-4">
          <span className="text-xs text-muted-foreground">Taxa de conversão</span>
          <span className="font-display text-xl font-semibold text-success">{relatorio.taxaConversao.toFixed(1)}%</span>
        </CardContent></Card>
        <Card><CardContent className="flex flex-col gap-1 p-4">
          <span className="text-xs text-muted-foreground">Tempo médio até fechar</span>
          <span className="font-display text-xl font-semibold text-foreground">
            {relatorio.tempoMedioFechamentoDias != null ? `${relatorio.tempoMedioFechamentoDias.toFixed(1)} dias` : "—"}
          </span>
        </CardContent></Card>
        <Card><CardContent className="flex flex-col gap-1 p-4">
          <span className="text-xs text-muted-foreground">Recuperados pela IA</span>
          <span className="font-display text-xl font-semibold text-primary">{relatorio.clientesRecuperadosPelaIA}</span>
        </CardContent></Card>
        <Card><CardContent className="flex flex-col gap-1 p-4">
          <span className="text-xs text-muted-foreground">Sem retorno</span>
          <span className="font-display text-xl font-semibold text-muted-foreground">{relatorio.cardsSemRetorno}</span>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Vendas por vendedor (30 dias)</CardTitle></CardHeader>
        <CardContent className="h-64">
          <RelatorioDesempenhoChart dados={desempenhoEquipe} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Motivos de perda</CardTitle></CardHeader>
        <CardContent>
          {relatorio.motivosPerda.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum lead marcado como perdido ainda.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {relatorio.motivosPerda.map((m) => (
                <div key={m.motivo} className="flex items-center justify-between rounded-md border border-border p-2.5 text-sm">
                  <span className="text-foreground">{m.motivo}</span>
                  <span className="font-medium text-muted-foreground">{m.quantidade}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
