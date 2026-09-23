import { ImportarPastaImagensPanel } from "@/components/banco-imagens/importar-pasta-imagens-panel";
import { ListaGruposPanel } from "@/components/banco-imagens/lista-grupos-panel";
import { PendenciasPanel } from "@/components/banco-imagens/pendencias-panel";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function BancoImagensPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Banco Central de Imagens"
        description="Importa uma pasta inteira ou em lote — a vinculação com produtos/estoque é automática por marca+modelo+cor"
      />

      <Tabs defaultValue="importar">
        <TabsList>
          <TabsTrigger value="importar">Importar</TabsTrigger>
          <TabsTrigger value="grupos">Grupos</TabsTrigger>
          <TabsTrigger value="pendencias">Pendências</TabsTrigger>
        </TabsList>
        <TabsContent value="importar"><ImportarPastaImagensPanel /></TabsContent>
        <TabsContent value="grupos"><ListaGruposPanel /></TabsContent>
        <TabsContent value="pendencias"><PendenciasPanel /></TabsContent>
      </Tabs>
    </div>
  );
}
