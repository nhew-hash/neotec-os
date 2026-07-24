import { listarPedidosLoja } from "@/services/loja/pedidos-loja.service";
import { PedidosLojaPanel } from "@/components/loja-admin/pedidos-loja-panel";
import { PageHeader } from "@/components/ui/page-header";

export default async function PedidosLojaPage() {
  const pedidos = await listarPedidosLoja();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Pedidos da Loja" description={`${pedidos.length} pedido(s) recebido(s) pela loja online`} />
      <PedidosLojaPanel pedidos={pedidos} />
    </div>
  );
}
