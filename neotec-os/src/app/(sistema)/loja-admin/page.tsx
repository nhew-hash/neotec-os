import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { formatCurrency } from "@/utils";

export default async function LojaAdminDashboardPage() {
  const supabase = await createClient();

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const [{ data: pedidosMes }, { count: totalPedidos }, { count: pedidosNovos }, { data: cupons }] = await Promise.all([
    supabase.from("pedidos_loja").select("valor_total, status").gte("created_at", inicioMes.toISOString()),
    supabase.from("pedidos_loja").select("id", { count: "exact", head: true }),
    supabase.from("pedidos_loja").select("id", { count: "exact", head: true }).eq("status", "novo"),
    supabase.from("cupons").select("id", { count: "exact", head: true }).eq("ativo", true),
  ]);

  const pedidosConcluidosMes = (pedidosMes ?? []).filter((p) => p.status === "concluido");
  const receitaMes = pedidosConcluidosMes.reduce((acc, p) => acc + p.valor_total, 0);
  const ticketMedio = pedidosConcluidosMes.length > 0 ? receitaMes / pedidosConcluidosMes.length : 0;

  const cards = [
    { label: "Receita do mês", valor: formatCurrency(receitaMes) },
    { label: "Pedidos concluídos (mês)", valor: String(pedidosConcluidosMes.length) },
    { label: "Ticket médio (mês)", valor: formatCurrency(ticketMedio) },
    { label: "Pedidos aguardando atenção", valor: String(pedidosNovos ?? 0) },
    { label: "Total de pedidos (histórico)", valor: String(totalPedidos ?? 0) },
    { label: "Cupons ativos", valor: String(cupons?.length ?? 0) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Dashboard da Loja" description="Números reais — direto de pedidos_loja e vendas, nada estimado" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="neotec-dado mt-1 text-xl font-semibold text-foreground">{c.valor}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
