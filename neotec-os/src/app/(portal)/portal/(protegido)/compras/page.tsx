import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateTime } from "@/utils";

export default async function PortalComprasPage() {
  const supabase = await createClient();
  const { data: vendas } = await supabase.from("vendas").select("*").order("data_venda", { ascending: false });

  return (
    <div className="flex flex-col gap-3">
      <h1 className="font-display text-lg font-semibold text-foreground">Minhas compras</h1>
      {(vendas ?? []).length === 0 && <p className="text-sm text-muted-foreground">Nenhuma compra registrada ainda.</p>}
      {(vendas ?? []).map((v) => (
        <Card key={v.id}>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">{formatCurrency(v.valor_total)}</span>
              <span className="text-xs text-muted-foreground">{formatDateTime(v.data_venda)}</span>
            </div>
            <Badge variant={v.status === "concluida" ? "success" : "secondary"}>{v.status}</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
