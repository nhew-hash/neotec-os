import { listarPedidosLoja } from "@/services/loja/pedidos-loja.service";
import { listarSolicitacoesTradeIn } from "@/services/loja/trade-in-staff.service";
import { PedidosLojaPanel } from "@/components/loja-admin/pedidos-loja-panel";
import { TradeInPanel } from "@/components/loja-admin/trade-in-panel";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function PedidosLojaPage() {
  const [pedidos, tradeIns] = await Promise.all([listarPedidosLoja(), listarSolicitacoesTradeIn()]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Pedidos da Loja" description="Pedidos e solicitações de trade-in vindos da loja online" />
      <Tabs defaultValue="pedidos">
        <TabsList>
          <TabsTrigger value="pedidos">Pedidos ({pedidos.length})</TabsTrigger>
          <TabsTrigger value="trade-in">Trade-in ({tradeIns.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="pedidos"><PedidosLojaPanel pedidos={pedidos} /></TabsContent>
        <TabsContent value="trade-in"><TradeInPanel solicitacoes={tradeIns} /></TabsContent>
      </Tabs>
    </div>
  );
}
