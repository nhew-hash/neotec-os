import { redirect } from "next/navigation";
import { Package } from "lucide-react";
import { buscarClientePortalLogado, listarPedidosDoClientePortal } from "@/services/portal/portal.service";
import { PortalLogoutButton } from "@/components/portal/portal-logout-button";
import { formatCurrency, formatDateTime } from "@/utils";

const LABEL_STATUS: Record<string, string> = { novo: "Recebido", em_atendimento: "Em preparação", concluido: "Concluído", cancelado: "Cancelado" };
const COR_STATUS: Record<string, string> = { novo: "bg-secondary text-muted-foreground", em_atendimento: "bg-warning-soft text-warning-text", concluido: "bg-success/10 text-success-text", cancelado: "bg-danger/10 text-danger" };

export default async function PortalDashboardPage() {
  const cliente = await buscarClientePortalLogado();
  if (!cliente) redirect("/portal/login");

  const pedidos = await listarPedidosDoClientePortal(cliente.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">Olá, {cliente.nome.split(" ")[0]}</h1>
          <p className="text-sm text-muted-foreground">Seus pedidos na Neotec</p>
        </div>
        <PortalLogoutButton />
      </div>

      <div className="flex flex-col gap-3">
        {pedidos.map((p) => (
          <div key={p.id} className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{formatDateTime(p.created_at)}</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${COR_STATUS[p.status] ?? "bg-secondary text-muted-foreground"}`}>{LABEL_STATUS[p.status] ?? p.status}</span>
            </div>
            <div className="flex flex-col gap-1 text-sm text-foreground">
              {p.itens.map((item, i) => <span key={i}>{item.quantidade}x {item.nome}</span>)}
            </div>
            <p className="mt-2 text-right font-semibold text-foreground">{formatCurrency(p.valor_total)}</p>
          </div>
        ))}
        {pedidos.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
            <Package className="h-8 w-8" />
            <p className="text-sm">Nenhum pedido ainda.</p>
          </div>
        )}
      </div>
    </div>
  );
}
