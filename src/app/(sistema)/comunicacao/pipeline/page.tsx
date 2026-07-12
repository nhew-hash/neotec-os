import { listarEtapas, listarCards, listarFollowupsPendentes } from "@/services/crm-pipeline/crm-pipeline.service";
import { listarClientes } from "@/services/clientes/clientes.service";
import { PipelineKanban } from "@/components/comunicacao/pipeline-kanban";
import { NovaOportunidadeForm, FollowupsPendentesList } from "@/components/comunicacao/pipeline-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PipelinePage() {
  const [etapas, cards, followups, clientes] = await Promise.all([
    listarEtapas(), listarCards(), listarFollowupsPendentes(), listarClientes(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Pipeline de relacionamento</h1>
        <p className="text-sm text-muted-foreground">
          Funil configurável — {cards.length} oportunidade(s) em {etapas.length} etapas
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <PipelineKanban etapas={etapas} cards={cards} />

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader><CardTitle>Nova oportunidade</CardTitle></CardHeader>
            <CardContent><NovaOportunidadeForm clientes={clientes} etapas={etapas} /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Follow-ups pendentes</CardTitle></CardHeader>
            <CardContent><FollowupsPendentesList followups={followups} /></CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
