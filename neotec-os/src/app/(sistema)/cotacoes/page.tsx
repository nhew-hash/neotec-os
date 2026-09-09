import Link from "next/link";
import { Plus, GitCompare } from "lucide-react";
import { listarCotacoes } from "@/services/cotacoes/cotacoes.service";
import { obterDashboardCotacoes } from "@/services/cotacoes/cotacoes-dashboard.service";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardCotacoesPanel } from "@/components/cotacoes/dashboard-cotacoes-panel";
import { BuscaRapidaCotacoes } from "@/components/cotacoes/busca-rapida-cotacoes";
import { CotacaoCard } from "@/components/cotacoes/cotacao-card";

export default async function CotacoesPage() {
  const [cotacoes, dashboard] = await Promise.all([listarCotacoes(), obterDashboardCotacoes()]);
  const ativas = cotacoes.filter((c) => c.status === "ativa");
  const arquivadas = cotacoes.filter((c) => c.status === "arquivada");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Central de Cotações"
        description={`${ativas.length} cotação(ões) ativa(s)`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/cotacoes/comparar"><GitCompare className="h-4 w-4" />Comparar</Link>
            </Button>
            <Button asChild>
              <Link href="/cotacoes/nova"><Plus className="h-4 w-4" />Nova cotação</Link>
            </Button>
          </>
        }
      />

      <BuscaRapidaCotacoes />

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="ativas">Ativas ({ativas.length})</TabsTrigger>
          <TabsTrigger value="arquivadas">Arquivadas ({arquivadas.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardCotacoesPanel dados={dashboard} />
        </TabsContent>

        <TabsContent value="ativas">
          {ativas.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Nenhuma cotação ativa ainda.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ativas.map((c) => <CotacaoCard key={c.id} cotacao={c} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="arquivadas">
          {arquivadas.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Nenhuma cotação arquivada.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {arquivadas.map((c) => <CotacaoCard key={c.id} cotacao={c} />)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
