import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/utils";

export default async function PortalOrdensPage() {
  const supabase = await createClient();
  const { data: ordens } = await supabase.from("ordens_servico").select("*").order("data_entrada", { ascending: false });

  return (
    <div className="flex flex-col gap-3">
      <h1 className="font-display text-lg font-semibold text-foreground">Minhas ordens de serviço</h1>
      {(ordens ?? []).length === 0 && <p className="text-sm text-muted-foreground">Nenhuma OS registrada ainda.</p>}
      {(ordens ?? []).map((os) => (
        <Card key={os.id}>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex flex-col">
              <span className="font-mono text-xs text-muted-foreground">{os.numero_os}</span>
              <span className="text-sm text-foreground">{os.defeito}</span>
              <span className="text-xs text-muted-foreground">Entrada: {formatDate(os.data_entrada)}</span>
            </div>
            <Badge>{os.status}</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
