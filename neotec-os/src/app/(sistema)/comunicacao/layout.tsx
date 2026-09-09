import type { ReactNode } from "react";
import { listarConversas } from "@/services/whatsapp/whatsapp.service";
import { ComunicacaoShell } from "@/components/comunicacao/comunicacao-shell";
import { ConversasList } from "@/components/comunicacao/conversas-list";

export default async function ComunicacaoLayout({ children }: { children: ReactNode }) {
  const conversas = await listarConversas();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Comunicação</h1>
        <p className="text-sm text-muted-foreground">{conversas.length} conversa(s)</p>
      </div>

      <ComunicacaoShell lista={<ConversasList conversas={conversas} />}>
        {children}
      </ComunicacaoShell>
    </div>
  );
}
