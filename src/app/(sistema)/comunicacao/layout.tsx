import Link from "next/link";
import { GitBranch } from "lucide-react";
import { listarConversas } from "@/services/whatsapp/whatsapp.service";
import { ComunicacaoShell } from "@/components/comunicacao/comunicacao-shell";
import { ConversasList } from "@/components/comunicacao/conversas-list";
import { Button } from "@/components/ui/button";

export default async function ComunicacaoLayout({ children }: { children: React.ReactNode }) {
  const conversas = await listarConversas();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">Comunicação</h1>
          <p className="text-sm text-muted-foreground">{conversas.length} conversa(s)</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/comunicacao/pipeline"><GitBranch className="h-4 w-4" />Pipeline</Link>
        </Button>
      </div>

      <ComunicacaoShell lista={<ConversasList conversas={conversas} />}>
        {children}
      </ComunicacaoShell>
    </div>
  );
}
