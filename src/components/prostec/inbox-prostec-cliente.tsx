"use client";

import { useState, useEffect, useTransition } from "react";
import { Bot, User, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  assumirConversaProstecAction, enviarMensagemManualProstecAction, marcarConversaLidaProstecAction,
  listarConversasProstecAction, buscarConversaComMensagensAction,
} from "@/services/prostec/prostec.actions";
import { formatDateTime } from "@/utils";

// Tipos duplicados aqui de propósito — mesmo "import type" do
// prostec.service.ts causava o bundler arrastar o arquivo inteiro
// (que usa next/headers) pro bundle do cliente. Nunca importar nada
// desse arquivo, nem tipo, de um "use client".
interface ConversaProstec {
  id: string;
  telefone: string;
  status: string;
  bot_ativo: boolean;
  etapa_bot: string;
  nao_lidas: number;
  ultima_mensagem_em: string | null;
  lead_empresa_nome: string | null;
  lead_id: string | null;
}

interface MensagemProstec {
  id: string;
  remetente: string;
  conteudo: string;
  ia_gerada: boolean;
  enviada_em: string;
}

const ETAPA_LABELS: Record<string, string> = {
  abertura: "Iniciando", descobrir_responsavel: "Confirmando responsável", perguntar_site: "Perguntando sobre site",
  apresentar_oportunidade: "Apresentando oportunidade", qualificado: "Qualificado 🔥", encerrado: "Encerrado",
};

export function InboxProstecCliente({ conversasIniciais }: { conversasIniciais: ConversaProstec[] }) {
  const [conversas, setConversas] = useState(conversasIniciais);
  const [conversaAtivaId, setConversaAtivaId] = useState<string | null>(conversasIniciais[0]?.id ?? null);
  const [mensagens, setMensagens] = useState<MensagemProstec[]>([]);
  const [conversaAtiva, setConversaAtiva] = useState<ConversaProstec | null>(null);
  const [texto, setTexto] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!conversaAtivaId) return;
    (async () => {
      const result = await buscarConversaComMensagensAction(conversaAtivaId);
      if (result.success) {
        setMensagens(result.data.mensagens);
        setConversaAtiva(result.data.conversa);
        void marcarConversaLidaProstecAction(conversaAtivaId);
      }
    })();
  }, [conversaAtivaId]);

  // Atualiza a lista de conversas periodicamente — pra ver mensagem nova do bot/lead sem precisar recarregar a página inteira.
  useEffect(() => {
    const intervalo = setInterval(async () => {
      const resultLista = await listarConversasProstecAction();
      if (resultLista.success) setConversas(resultLista.data);
      if (conversaAtivaId) {
        const result = await buscarConversaComMensagensAction(conversaAtivaId);
        if (result.success) setMensagens(result.data.mensagens);
      }
    }, 8000);
    return () => clearInterval(intervalo);
  }, [conversaAtivaId]);

  function handleEnviar() {
    if (!texto.trim() || !conversaAtiva) return;
    const textoEnviado = texto;
    setTexto("");
    startTransition(async () => {
      const result = await enviarMensagemManualProstecAction(conversaAtiva.id, conversaAtiva.telefone, textoEnviado);
      if (result.success) {
        const atualizado = await buscarConversaComMensagensAction(conversaAtiva.id);
        if (atualizado.success) setMensagens(atualizado.data.mensagens);
      }
    });
  }

  function handleAssumir() {
    if (!conversaAtiva) return;
    startTransition(async () => {
      await assumirConversaProstecAction(conversaAtiva.id);
      const atualizado = await buscarConversaComMensagensAction(conversaAtiva.id);
      if (atualizado.success) setConversaAtiva(atualizado.data.conversa);
    });
  }

  return (
    <div className="grid flex-1 grid-cols-1 gap-3 overflow-hidden lg:grid-cols-[280px_1fr]">
      <div className="flex flex-col gap-1.5 overflow-y-auto rounded-2xl border border-black/[0.06] bg-white p-2">
        {conversas.length === 0 && <p className="p-4 text-center text-xs text-muted-foreground">Nenhuma conversa ainda.</p>}
        {conversas.map((c) => (
          <button
            key={c.id} type="button" onClick={() => setConversaAtivaId(c.id)}
            className={cn("flex flex-col gap-0.5 rounded-xl p-2.5 text-left transition-colors", conversaAtivaId === c.id ? "bg-primary/10" : "hover:bg-secondary/60")}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">{c.lead_empresa_nome ?? c.telefone}</span>
              {c.nao_lidas > 0 && <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-white">{c.nao_lidas}</span>}
            </div>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              {c.bot_ativo ? <Bot className="h-3 w-3" /> : <User className="h-3 w-3" />}
              {ETAPA_LABELS[c.etapa_bot] ?? c.etapa_bot}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
        {!conversaAtiva ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Selecione uma conversa</div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-black/[0.06] p-3">
              <div>
                <p className="text-sm font-medium text-foreground">{conversaAtiva.lead_empresa_nome ?? conversaAtiva.telefone}</p>
                <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  {conversaAtiva.bot_ativo ? <><Bot className="h-3 w-3" />Bot conduzindo</> : <><User className="h-3 w-3" />Com você</>}
                  {" · "}{ETAPA_LABELS[conversaAtiva.etapa_bot] ?? conversaAtiva.etapa_bot}
                </p>
              </div>
              {conversaAtiva.bot_ativo && <Button type="button" size="sm" variant="outline" onClick={handleAssumir} disabled={isPending}>Assumir conversa</Button>}
            </div>

            <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
              {mensagens.map((m) => (
                <div key={m.id} className={cn("max-w-[75%] rounded-2xl px-3 py-2 text-sm", m.remetente === "lead" ? "self-start bg-secondary text-foreground" : "self-end bg-primary text-white")}>
                  <p>{m.conteudo}</p>
                  <p className={cn("mt-1 text-[10px]", m.remetente === "lead" ? "text-muted-foreground" : "text-white/70")}>
                    {m.remetente === "bot" && "🤖 "}{formatDateTime(m.enviada_em)}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex gap-2 border-t border-black/[0.06] p-3">
              <Input placeholder="Escreve uma mensagem..." value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleEnviar()} className="h-10" />
              <Button type="button" size="icon" onClick={handleEnviar} disabled={isPending}><Send className="h-4 w-4" /></Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
