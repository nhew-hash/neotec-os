import Link from "next/link";
import { CalendarClock, BarChart3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listarEtapas, listarCards, listarFollowupsPendentes } from "@/services/crm-pipeline/crm-pipeline.service";
import { listarOrdensServico } from "@/services/assistencia/assistencia.service";
import { PipelineKanban } from "@/components/crm/pipeline-kanban";
import { AssistenciaKanban } from "@/components/crm/assistencia-kanban";
import { NovaOportunidadeButton, FollowupsPanel } from "@/components/crm/pipeline-sidebar";
import { CrmRealtimeListener } from "@/components/crm/crm-realtime-listener";
import { contarFollowupsUrgentes } from "@/utils/followups";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ABAS = ["pipeline", "assistencia", "followups"] as const;

export default async function CrmPage({ searchParams }: { searchParams: Promise<{ aba?: string; filtro?: string }> }) {
  const { aba, filtro } = await searchParams;
  const supabase = await createClient();
  // A página não baixa mais a base inteira de clientes (era só para o
  // seletor de "Nova oportunidade", que agora busca no servidor).
  const [etapas, cards, followups, ordensServico, { data: { user } }] = await Promise.all([
    listarEtapas(), listarCards(), listarFollowupsPendentes(), listarOrdensServico(), supabase.auth.getUser(),
  ]);

  const urgentes = contarFollowupsUrgentes(followups);
  const abaInicial = ABAS.includes(aba as (typeof ABAS)[number]) ? aba! : "pipeline";

  return (
    <div className="flex flex-col gap-5">
      <CrmRealtimeListener />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">CRM</h1>
          <p className="text-sm text-muted-foreground">Oportunidades, follow-ups e o andamento de cada cliente.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/crm/retornos"><CalendarClock aria-hidden />Agenda</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/crm/relatorios"><BarChart3 aria-hidden />Relatórios</Link>
          </Button>
          <NovaOportunidadeButton etapas={etapas} />
        </div>
      </div>

      <Tabs defaultValue={abaInicial}>
        <TabsList>
          <TabsTrigger value="pipeline">Vendas</TabsTrigger>
          <TabsTrigger value="assistencia">Assistência</TabsTrigger>
          <TabsTrigger value="followups" className="gap-1.5">
            Follow-ups
            {urgentes > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white" aria-label={`${urgentes} para hoje ou atrasados`}>
                {urgentes}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="mt-4">
          <PipelineKanban etapas={etapas} cards={cards} usuarioId={user?.id ?? ""} filtrosIniciais={filtro === "paradas" ? { somenteParadas: true } : filtro === "minhas" ? { somenteMinhas: true } : undefined} />
        </TabsContent>

        <TabsContent value="assistencia" className="mt-4">
          <AssistenciaKanban ordens={ordensServico} />
        </TabsContent>

        <TabsContent value="followups" className="mt-4">
          <div className="max-w-2xl">
            <FollowupsPanel followups={followups} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
