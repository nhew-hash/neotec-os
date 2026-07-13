import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/utils";

export default async function PortalNotificacoesPage() {
  const supabase = await createClient();
  const { data: notificacoes } = await supabase
    .from("fila_notificacoes").select("*").order("criado_em", { ascending: false });

  return (
    <div className="flex flex-col gap-3">
      <h1 className="font-display text-lg font-semibold text-foreground">Notificações</h1>
      {(notificacoes ?? []).length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhuma notificação ainda — o envio automático por WhatsApp será ativado em breve.
        </p>
      )}
      {(notificacoes ?? []).map((n) => (
        <div key={n.id} className="rounded-md border border-border bg-card p-3 text-sm text-muted-foreground">
          {formatDateTime(n.criado_em)} — {n.evento}
        </div>
      ))}
    </div>
  );
}
