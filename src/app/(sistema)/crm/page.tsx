import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { listarEtapas, listarCards, listarFollowupsPendentes } from "@/services/crm-pipeline/crm-pipeline.service";
import { listarRetornosDeHoje } from "@/services/crm/crm.service";
import { listarClientes } from "@/services/clientes/clientes.service";
import { PipelineKanban } from "@/components/crm/pipeline-kanban";
import { NovaOportunidadeForm, FollowupsPendentesList } from "@/components/crm/pipeline-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function CrmPage() {
  const [etapas, cards, followups, retornosHoje, clientes] = await Promise.all([
    listarEtapas(), listarCards(), listarFollowupsPendentes(), listarRetornosDeHoje(), listarClientes(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">CRM — Pipeline</h1>
          <p className="text-sm text-muted-foreground">
            {cards.length} oportunidade(s) em {etapas.length} etapas
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/crm/retornos"><CalendarClock className="h-4 w-4" />Retornos</Link>
        </Button>
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
            <CardContent><FollowupsPendentesList followups={followups} retornosHoje={retornosHoje} /></CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
