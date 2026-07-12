import { notFound } from "next/navigation";
import { buscarAparelhoPorId } from "@/services/estoque/estoque.service";
import { ChecklistQualidade } from "@/components/estoque/checklist-qualidade";
import { StatusAparelhoBadge } from "@/components/estoque/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/utils";

export default async function AparelhoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const aparelho = await buscarAparelhoPorId(id);
  if (!aparelho) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">
            {aparelho.produto?.nome ?? "Aparelho"}
          </h1>
          <p className="font-mono text-sm text-muted-foreground">IMEI {aparelho.imei}</p>
        </div>
        <StatusAparelhoBadge status={aparelho.status} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader><CardTitle>Controle de qualidade</CardTitle></CardHeader>
          <CardContent>
            <ChecklistQualidade aparelhoId={aparelho.id} statusAtual={aparelho.status} />
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader><CardTitle>Dados do aparelho</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <Info label="Cor" value={aparelho.cor} />
            <Info label="Memória" value={aparelho.memoria} />
            <Info label="Bateria" value={aparelho.bateria ? `${aparelho.bateria}%` : null} />
            <Info label="Condição" value={aparelho.condicao} />
            <Info label="Entrada" value={formatDate(aparelho.data_entrada)} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between border-b border-border py-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value ?? "—"}</span>
    </div>
  );
}
