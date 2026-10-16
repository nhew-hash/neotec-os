import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obterConversa, listarMensagens, marcarConversaComoLida } from "@/services/whatsapp/whatsapp.service";
import { obterResumoClienteAtendimento } from "@/services/comunicacao/comunicacao-cliente-resumo.service";
import { ChatPanel } from "@/components/comunicacao/chat-panel";
import { ClienteInfoPanel } from "@/components/comunicacao/cliente-info-panel";

export default async function ConversaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // As mensagens não dependem da conversa: começam junto (uma ida ao banco a menos em série).
  const mensagensP = listarMensagens(id);
  mensagensP.catch(() => { /* tratado no await abaixo */ });
  const [conversa, { data: { user } }] = await Promise.all([obterConversa(id), supabase.auth.getUser()]);
  if (!conversa) notFound();

  const [{ mensagens, temMais }, resumoCliente] = await Promise.all([
    mensagensP,
    obterResumoClienteAtendimento(conversa.cliente_id, conversa.card_id),
    // Falhar ao zerar o contador não impede abrir a conversa.
    conversa.nao_lidas > 0 ? marcarConversaComoLida(id).catch((err) => console.error("Falha ao marcar conversa como lida:", err)) : null,
  ]);

  return (
    <div className="flex h-full min-h-0">
      <div className="flex min-w-0 flex-1 flex-col">
        <ChatPanel
          conversa={conversa}
          mensagens={mensagens}
          temMaisAntigas={temMais}
          usuarioId={user?.id ?? ""}
          etapa={resumoCliente.etapaFunil ? { nome: resumoCliente.etapaFunil.nome, cor: resumoCliente.etapaFunil.cor } : null}
          resumo={resumoCliente}
        />
      </div>
      <ClienteInfoPanel resumo={resumoCliente} conversaId={conversa.id} />
    </div>
  );
}
