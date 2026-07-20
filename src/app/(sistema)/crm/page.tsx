import Link from "next/link";
import { CalendarClock, BarChart3 } from "lucide-react";
import { listarEtapas, listarCards, listarFollowupsPendentes } from "@/services/crm-pipeline/crm-pipeline.service";
import { listarRetornosPendentes } from "@/services/crm/crm.service";
import { listarClientes } from "@/services/clientes/clientes.service";
import { PipelineKanban } from "@/components/crm/pipeline-kanban";
import { NovaOportunidadeButton, FollowupsPanel } from "@/components/crm/pipeline-sidebar";
import { CrmRealtimeListener } from "@/components/crm/crm-realtime-listener";
import { contarFollowupsUrgentes } from "@/utils/followups";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function CrmPage() {
  const [etapas, cards, followups, retornos, clientes] = await Promise.all([
    listarEtapas(), listarCards(), listarFollowupsPendentes(), listarRetornosPendentes(), listarClientes(),
  ]);

  const urgentes = contarFollowupsUrgentes(followups, retornos);

  return (
    <div className="flex flex-col gap-6">
      <CrmRealtimeListener />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">CRM</h1>
          <p className="text-sm text-muted-foreground">
            {cards.length} oportunidade(s) em {etapas.length} etapas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/crm/retornos"><CalendarClock className="h-4 w-4" />Agenda completa</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/crm/relatorios"><BarChart3 className="h-4 w-4" />Relatórios</Link>
          </Button>
          <NovaOportunidadeButton clientes={clientes} etapas={etapas} />
        </div>
      </div>

      <Tabs defaultValue="pipeline">
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="followups" className="gap-1.5">
            Follow-ups pendentes
            {urgentes > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
                {urgentes}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline">
          <PipelineKanban etapas={etapas} cards={cards} />
        </TabsContent>

        <TabsContent value="followups">
          <div className="max-w-xl">
            <FollowupsPanel followups={followups} retornos={retornos} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
