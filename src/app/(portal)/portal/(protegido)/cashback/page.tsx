import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDateTime } from "@/utils";

export default async function PortalCashbackPage() {
  const supabase = await createClient();
  const [{ data: movimentos }, { data: saldo }] = await Promise.all([
    supabase.from("cashback").select("*").order("data", { ascending: false }),
    supabase.from("vw_cliente_cashback_saldo").select("saldo").maybeSingle(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-lg font-semibold text-foreground">Cashback</h1>
      <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Saldo disponível</p><p className="font-display text-2xl font-semibold">{formatCurrency(Number(saldo?.saldo ?? 0))}</p></CardContent></Card>

      <div className="flex flex-col gap-2">
        {(movimentos ?? []).map((m) => (
          <div key={m.id} className="flex items-center justify-between rounded-md border border-border bg-card p-3 text-sm">
            <div className="flex flex-col">
              <span className="text-foreground">{m.origem ?? "Movimentação"}</span>
              <span className="text-xs text-muted-foreground">{formatDateTime(m.data)}</span>
            </div>
            <span className={m.tipo === "credito" ? "text-success" : "text-danger"}>
              {m.tipo === "credito" ? "+" : "-"}{formatCurrency(m.valor)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
