import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { listarConversas, listarMensagens, marcarConversaComoLida } from "@/services/whatsapp/whatsapp.service";
import { ChatPanel } from "@/components/comunicacao/chat-panel";

export default async function ConversaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const conversas = await listarConversas();
  const conversa = conversas.find((c) => c.id === id);
  if (!conversa) notFound();

  const mensagens = await listarMensagens(id);
  if (conversa.nao_lidas > 0) await marcarConversaComoLida(id);

  return (
    <div className="flex h-full flex-col">
      <Link href="/comunicacao" className="flex items-center gap-1 border-b border-border p-2 text-xs text-muted-foreground md:hidden">
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar às conversas
      </Link>
      <ChatPanel conversa={conversa} mensagens={mensagens} />
    </div>
  );
}
