import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/utils";

export default async function PortalPerfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: cliente } = await supabase.from("clientes").select("*").eq("portal_user_id", user?.id ?? "").maybeSingle();

  if (!cliente) return null;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-lg font-semibold text-foreground">Meu perfil</h1>
      <Card>
        <CardContent className="flex flex-col gap-2 p-4 text-sm">
          <Info label="Nome" value={cliente.nome} />
          <Info label="WhatsApp" value={cliente.whatsapp} />
          <Info label="E-mail" value={cliente.email} />
          <Info label="Apple ID" value={cliente.apple_id} />
          <Info label="Nascimento" value={cliente.data_nascimento ? formatDate(cliente.data_nascimento) : null} />
        </CardContent>
      </Card>
      <p className="text-center text-xs text-muted-foreground">
        Para alterar algum dado, fale com a equipe da loja.
      </p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between border-b border-border py-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value ?? "—"}</span>
    </div>
  );
}
