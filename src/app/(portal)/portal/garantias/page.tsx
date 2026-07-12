import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/utils";

export default async function PortalGarantiasPage() {
  const supabase = await createClient();
  const { data: garantias } = await supabase.from("garantias").select("*").order("fim", { ascending: false });

  return (
    <div className="flex flex-col gap-3">
      <h1 className="font-display text-lg font-semibold text-foreground">Minhas garantias</h1>
      {(garantias ?? []).length === 0 && <p className="text-sm text-muted-foreground">Nenhuma garantia ativa.</p>}
      {(garantias ?? []).map((g) => (
        <Card key={g.id}>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex flex-col">
              <span className="text-sm text-foreground">{g.tipo === "produto" ? "Garantia de produto" : "Garantia de serviço"}</span>
              <span className="text-xs text-muted-foreground">Até {formatDate(g.fim)}</span>
            </div>
            <Badge variant={new Date(g.fim) > new Date() ? "success" : "secondary"}>
              {new Date(g.fim) > new Date() ? "Ativa" : "Expirada"}
            </Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
