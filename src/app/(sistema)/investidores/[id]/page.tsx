import { notFound } from "next/navigation";
import {
  buscarInvestidorPorId, buscarResumoInvestidor, listarMovimentosPorInvestidor,
  listarAparelhosPorInvestidor, listarAparelhosSemInvestidor,
} from "@/services/investidores/investidores.service";
import { ResumoInvestidorCards, MovimentoInvestidorForm, VincularAparelhoForm } from "@/components/investidores/investidor-components";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateTime } from "@/utils";

export default async function InvestidorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const investidor = await buscarInvestidorPorId(id);
  if (!investidor) notFound();

  const [resumo, movimentos, aparelhos, aparelhosDisponiveis] = await Promise.all([
    buscarResumoInvestidor(id), listarMovimentosPorInvestidor(id), listarAparelhosPorInvestidor(id), listarAparelhosSemInvestidor(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-xl font-semibold text-foreground">{investidor.nome}</h1>

      {resumo && <ResumoInvestidorCards resumo={resumo} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader><CardTitle>Aparelhos aplicados</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2">
              {aparelhos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum aparelho vinculado ainda.</p>}
              {aparelhos.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-md border border-border p-2 text-sm">
                  <span className="font-mono text-xs">{a.imei}</span>
                  <Badge>{a.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Histórico de movimentos</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2">
              {movimentos.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-md border border-border p-2 text-sm">
                  <span className="text-muted-foreground">{formatDateTime(m.data)}</span>
                  <span className={m.tipo === "aporte" ? "text-success" : "text-danger"}>
                    {m.tipo === "aporte" ? "+" : "-"}{formatCurrency(m.valor)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="flex h-fit flex-col gap-6">
          <Card>
            <CardHeader><CardTitle>Novo movimento</CardTitle></CardHeader>
            <CardContent><MovimentoInvestidorForm investidorId={id} /></CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Vincular aparelho existente</CardTitle></CardHeader>
            <CardContent><VincularAparelhoForm investidorId={id} aparelhosDisponiveis={aparelhosDisponiveis} /></CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
