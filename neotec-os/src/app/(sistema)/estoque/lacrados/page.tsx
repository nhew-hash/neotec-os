import { listarLacradosComVariantes } from "@/services/lacrados/lacrados.service";
import { LacradosGestaoPanel } from "@/components/lacrados/lacrados-gestao-panel";
import { AtualizarFornecedorPanel } from "@/components/lacrados/atualizar-fornecedor-panel";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function LacradosPage() {
  const modelos = await listarLacradosComVariantes();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Catálogo de Lacrados" description="Catálogo mestre — não é o estoque físico, é tudo que a loja PODE vender via fornecedor" />
      <Tabs defaultValue="fornecedor">
        <TabsList>
          <TabsTrigger value="fornecedor">Atualizar via fornecedor</TabsTrigger>
          <TabsTrigger value="manual">Gestão manual ({modelos.length} modelos)</TabsTrigger>
        </TabsList>
        <TabsContent value="fornecedor"><AtualizarFornecedorPanel /></TabsContent>
        <TabsContent value="manual"><LacradosGestaoPanel modelos={modelos} /></TabsContent>
      </Tabs>
    </div>
  );
}
