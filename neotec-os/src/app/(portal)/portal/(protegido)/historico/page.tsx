import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/utils";

export default async function PortalHistoricoPage() {
  const supabase = await createClient();
  const { data: eventos } = await supabase.from("timeline_eventos").select("*").order("data", { ascending: false });

  return (
    <div className="flex flex-col gap-3">
      <h1 className="font-display text-lg font-semibold text-foreground">Meu histórico</h1>
      {(eventos ?? []).map((e) => (
        <div key={e.id} className="flex items-center justify-between rounded-md border border-border bg-card p-3 text-sm">
          <div className="flex flex-col">
            <span className="text-foreground">{e.titulo}</span>
            <span className="text-xs text-muted-foreground">{formatDateTime(e.data)}</span>
          </div>
          <Badge variant="secondary">{e.tipo_evento}</Badge>
        </div>
      ))}
    </div>
  );
}
