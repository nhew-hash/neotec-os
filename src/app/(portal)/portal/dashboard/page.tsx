import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/utils";

export default async function PortalDashboardPage() {
  const supabase = await createClient();
  // RLS já restringe tudo ao cliente da sessão — nenhum filtro manual
  // por cliente_id é necessário aqui (nem seria confiável vindo do client).
  const [{ count: osAbertas }, { data: saldo }] = await Promise.all([
    supabase.from("ordens_servico").select("*", { count: "exact", head: true }).neq("status", "entregue"),
    supabase.from("vw_cliente_cashback_saldo").select("saldo").maybeSingle(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-lg font-semibold text-foreground">Minha Neotec</h1>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/portal/ordens">
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">OS em andamento</p><p className="font-display text-xl font-semibold">{osAbertas ?? 0}</p></CardContent></Card>
        </Link>
        <Link href="/portal/cashback">
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Saldo cashback</p><p className="font-display text-xl font-semibold">{formatCurrency(Number(saldo?.saldo ?? 0))}</p></CardContent></Card>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/portal/compras" className="rounded-card border border-border bg-card p-4 text-sm font-medium text-foreground">Minhas compras →</Link>
        <Link href="/portal/garantias" className="rounded-card border border-border bg-card p-4 text-sm font-medium text-foreground">Minhas garantias →</Link>
      </div>
    </div>
  );
}
