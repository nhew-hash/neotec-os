import { MessageCircle } from "lucide-react";
import { listarConversasProstec } from "@/services/prostec/prostec.service";
import { InboxProstecCliente } from "@/components/prostec/inbox-prostec-cliente";

export default async function InboxProstecPage() {
  const conversas = await listarConversasProstec();

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-primary" />
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">Inbox — Prostec</h1>
          <p className="text-sm text-muted-foreground">WhatsApp próprio da Prostec, separado da loja</p>
        </div>
      </div>

      <InboxProstecCliente conversasIniciais={conversas} />
    </div>
  );
}
