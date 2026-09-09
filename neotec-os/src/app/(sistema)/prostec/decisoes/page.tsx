import { Brain } from "lucide-react";
import { listarDecisoesIara, obterMetricasComerciaisProstec } from "@/services/prostec/prostec.service";
import { formatCurrency, formatDateTime } from "@/utils";

export default async function DecisoesIaraPage() {
  const [decisoes, metricas] = await Promise.all([listarDecisoesIara(50), obterMetricasComerciaisProstec()]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Brain className="h-5 w-5 text-primary" />
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">Decisões da Iara</h1>
          <p className="text-sm text-muted-foreground">Últimos 30 dias — pra entender "por que ela fez isso"</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <CardMetrica label="Taxa de resposta" valor={`${metricas.taxaResposta}%`} />
        <CardMetrica label="Taxa de interesse" valor={`${metricas.taxaInteresse}%`} />
        <CardMetrica label="Taxa de conversão" valor={`${metricas.taxaConversao}%`} destaque />
        <CardMetrica label="Ticket médio" valor={formatCurrency(metricas.ticketMedio)} />
        <CardMetrica label="Custo de IA (30d)" valor={formatCurrency(metricas.custoIaTotal)} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <CardMetrica label="Receita (30d)" valor={formatCurrency(metricas.receitaTotal)} destaque />
        <CardMetrica label="Custo por lead" valor={formatCurrency(metricas.custoPorLead)} />
        <CardMetrica label="Escaladas p/ humano" valor={String(metricas.escaladasParaHumano)} />
      </div>

      <div className="rounded-2xl border border-black/[0.06] bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/[0.06] text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="p-3 font-medium">Empresa</th>
              <th className="p-3 font-medium">Mensagem do cliente</th>
              <th className="p-3 font-medium">Intenção</th>
              <th className="p-3 font-medium">Decisão</th>
              <th className="p-3 font-medium">Desconto</th>
              <th className="p-3 text-right font-medium">Custo</th>
              <th className="p-3 font-medium">Quando</th>
            </tr>
          </thead>
          <tbody>
            {decisoes.map((d) => (
              <tr key={d.id} className="border-b border-black/[0.04] last:border-0">
                <td className="p-3 font-medium text-foreground">{d.lead_empresa_nome ?? "—"}</td>
                <td className="max-w-xs truncate p-3 text-muted-foreground">{d.mensagem_recebida}</td>
                <td className="p-3 text-muted-foreground">{d.intent ?? "—"}</td>
                <td className="p-3 text-muted-foreground">{d.decisao ?? "—"}</td>
                <td className="p-3">
                  {d.desconto_solicitado_pct ? (
                    <span className={d.desconto_validado ? "text-success-text" : "text-danger"}>
                      {d.desconto_solicitado_pct}% {d.desconto_validado ? "✓" : "⚠ bloqueado"}
                    </span>
                  ) : "—"}
                </td>
                <td className="p-3 text-right text-muted-foreground">{d.custo_estimado ? formatCurrency(d.custo_estimado) : "—"}</td>
                <td className="p-3 text-xs text-muted-foreground">{formatDateTime(d.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {decisoes.length === 0 && <p className="py-10 text-center text-xs text-muted-foreground">Nenhuma decisão registrada ainda.</p>}
      </div>
    </div>
  );
}

function CardMetrica({ label, valor, destaque }: { label: string; valor: string; destaque?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className={`font-display text-lg font-bold ${destaque ? "text-success" : "text-foreground"}`}>{valor}</span>
    </div>
  );
}
