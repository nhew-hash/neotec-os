"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Send, Image as ImageIcon, FileText, Mic, Check, CheckCheck, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { enviarMensagemAction } from "@/services/whatsapp/whatsapp.actions";
import { formatDateTime } from "@/utils";
import type { WhatsappMensagem, StatusEntregaMensagem } from "@/types";
import type { ConversaComCliente } from "@/services/whatsapp/whatsapp.service";

const STATUS_ICON: Record<StatusEntregaMensagem, ReactNode> = {
  enviando: <Clock className="h-3 w-3" />,
  enviado: <Check className="h-3 w-3" />,
  entregue: <CheckCheck className="h-3 w-3" />,
  lido: <CheckCheck className="h-3 w-3 text-primary" />,
  erro: <AlertCircle className="h-3 w-3 text-danger" />,
};

interface ChatPanelProps {
  conversa: ConversaComCliente;
  mensagens: WhatsappMensagem[];
}

export function ChatPanel({ conversa, mensagens }: ChatPanelProps) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function handleEnviar() {
    if (!texto.trim()) return;
    setErro(null);

    const formData = new FormData();
    formData.set("conversaId", conversa.id);
    formData.set("telefone", conversa.telefone);
    formData.set("texto", texto);

    startTransition(async () => {
      const result = await enviarMensagemAction(formData);
      if (!result.success) return setErro(result.error);
      setTexto("");
      router.refresh();
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border p-3">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-foreground">{conversa.cliente?.nome ?? conversa.telefone}</span>
          <span className="text-xs text-muted-foreground">{conversa.telefone}</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
        {mensagens.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>
        )}
        {mensagens.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex max-w-[75%] flex-col gap-1 rounded-lg px-3 py-2 text-sm",
              msg.direcao === "saida" ? "self-end bg-primary text-primary-foreground" : "self-start bg-secondary text-foreground"
            )}
          >
            <span>{msg.conteudo}</span>
            <div className={cn("flex items-center gap-1 text-[10px]", msg.direcao === "saida" ? "text-primary-foreground/70 justify-end" : "text-muted-foreground")}>
              {formatDateTime(msg.criado_em)}
              {msg.direcao === "saida" && STATUS_ICON[msg.status_entrega]}
            </div>
          </div>
        ))}
      </div>

      {erro && <p className="px-4 text-xs text-danger">{erro}</p>}

      <div className="flex items-end gap-2 border-t border-border p-3">
        {/* Botões preparados para os próximos tipos de mídia — envio real
            de arquivo depende de Storage + endpoint de mídia da Cloud API,
            fora do escopo desta entrega (ver README). */}
        <Button type="button" variant="ghost" size="icon" disabled title="Imagem (em breve)">
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
        </Button>
        <Button type="button" variant="ghost" size="icon" disabled title="Documento (em breve)">
          <FileText className="h-4 w-4 text-muted-foreground" />
        </Button>
        <Button type="button" variant="ghost" size="icon" disabled title="Áudio (em breve)">
          <Mic className="h-4 w-4 text-muted-foreground" />
        </Button>
        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleEnviar();
            }
          }}
          placeholder="Digite uma mensagem..."
          className="min-h-[40px] flex-1 resize-none"
          rows={1}
        />
        <Button type="button" size="icon" onClick={handleEnviar} disabled={isPending || !texto.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
