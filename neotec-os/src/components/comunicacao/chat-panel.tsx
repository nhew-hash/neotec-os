"use client";

import { useState, useTransition, useRef, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Send, FileText, Mic, Square, Check, CheckCheck, Clock, AlertCircle, Bot, BotOff, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { enviarMensagemAction, alternarIAPausadaAction, enviarAudioAction } from "@/services/whatsapp/whatsapp.actions";
import { useMensagensRealtime } from "@/hooks/use-mensagens-realtime";
import { SeletorEmoji } from "@/components/comunicacao/seletor-emoji";
import { SeletorFotoCatalogo } from "@/components/comunicacao/seletor-foto-catalogo";
import { AcoesRapidas } from "@/components/comunicacao/acoes-rapidas";
import { formatDateTime, formatDiaRelativo } from "@/utils";
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

/** Agrupa mensagens por dia, inserindo o dia como chave de grupo. */
function agruparPorDia(mensagens: WhatsappMensagem[]): { dia: string; itens: WhatsappMensagem[] }[] {
  const grupos: { dia: string; itens: WhatsappMensagem[] }[] = [];
  for (const msg of mensagens) {
    const diaChave = new Date(msg.criado_em).toDateString();
    const ultimoGrupo = grupos[grupos.length - 1];
    if (ultimoGrupo && ultimoGrupo.dia === diaChave) {
      ultimoGrupo.itens.push(msg);
    } else {
      grupos.push({ dia: diaChave, itens: [msg] });
    }
  }
  return grupos;
}

/** URL da mídia sempre passa por aqui — nunca um link fixo salvo no banco (ver rota /api/whatsapp-midia). */
function urlMidia(caminho: string): string {
  return `/api/whatsapp-midia?path=${encodeURIComponent(caminho)}`;
}

function MidiaMensagem({ msg }: { msg: WhatsappMensagem }) {
  if (!msg.url_midia) return null;

  // Foto do catálogo já vem com URL pública completa (bucket público,
  // não expira) — usa direto. Áudio gravado e foto recebida do cliente
  // ficam no bucket privado, só o CAMINHO é salvo, passa pela rota de
  // link temporário.
  const src = msg.url_midia.startsWith("http") ? msg.url_midia : urlMidia(msg.url_midia);

  if (msg.tipo === "imagem") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="Imagem" className="max-w-[240px] rounded-md" />;
  }
  if (msg.tipo === "audio") {
    return <audio controls src={src} className="h-9 max-w-[240px]" />;
  }
  return null;
}

export function ChatPanel({ conversa, mensagens: mensagensIniciais }: ChatPanelProps) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isTogglePending, startToggleTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [iaPausada, setIaPausada] = useState(conversa.ia_pausada);
  const [mostrarBotaoDescer, setMostrarBotaoDescer] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [enviandoAudio, setEnviandoAudio] = useState(false);
  const mensagens = useMensagensRealtime(conversa.id, mensagensIniciais);
  const grupos = agruparPorDia(mensagens);

  const containerRef = useRef<HTMLDivElement>(null);
  const fimRef = useRef<HTMLDivElement>(null);
  const totalMensagensAnterior = useRef(mensagens.length);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Auto-scroll pra última mensagem — mas só se o usuário já estava perto
  // do fim (não interrompe alguém lendo mensagens antigas pra cima).
  useEffect(() => {
    const chegouMensagemNova = mensagens.length > totalMensagensAnterior.current;
    totalMensagensAnterior.current = mensagens.length;

    const container = containerRef.current;
    if (!container) return;

    const pertoDoFim = container.scrollHeight - container.scrollTop - container.clientHeight < 150;

    if (pertoDoFim || !chegouMensagemNova) {
      fimRef.current?.scrollIntoView({ behavior: chegouMensagemNova ? "smooth" : "auto" });
      setMostrarBotaoDescer(false);
    } else if (chegouMensagemNova) {
      setMostrarBotaoDescer(true);
    }
  }, [mensagens.length]);

  function handleScroll() {
    const container = containerRef.current;
    if (!container) return;
    const pertoDoFim = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
    if (pertoDoFim) setMostrarBotaoDescer(false);
  }

  function irParaFim() {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
    setMostrarBotaoDescer(false);
  }

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
      setIaPausada(true); // mandar mensagem manual já pausa a IA nesta conversa (mesma regra do backend)
      router.refresh();
    });
  }

  function handleAlternarIA() {
    const novoEstado = !iaPausada;
    setIaPausada(novoEstado); // otimista — sensação de resposta imediata
    startToggleTransition(async () => {
      const result = await alternarIAPausadaAction(conversa.id, novoEstado);
      if (!result.success) setIaPausada(!novoEstado); // desfaz se der erro
    });
  }

  async function handleIniciarGravacao() {
    setErro(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        void handleEnviarAudioGravado(new Blob(chunksRef.current, { type: mimeType }));
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setGravando(true);
    } catch {
      setErro("Não foi possível acessar o microfone — confirma se o navegador tem permissão.");
    }
  }

  function handlePararGravacao() {
    mediaRecorderRef.current?.stop();
    setGravando(false);
  }

  function handleEnviarAudioGravado(blob: Blob) {
    setEnviandoAudio(true);
    const formData = new FormData();
    formData.set("conversaId", conversa.id);
    formData.set("telefone", conversa.telefone);
    formData.set("audio", blob, "audio.webm");

    startTransition(async () => {
      const result = await enviarAudioAction(formData);
      setEnviandoAudio(false);
      if (!result.success) return setErro(result.error);
      setIaPausada(true);
      router.refresh();
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border p-3">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-foreground">{conversa.cliente?.nome ?? conversa.telefone}</span>
          <span className="neotec-id-tag mt-0.5 w-fit">{conversa.telefone}</span>
        </div>
        <Button
          type="button"
          variant={iaPausada ? "outline" : "secondary"}
          size="sm"
          onClick={handleAlternarIA}
          disabled={isTogglePending}
          title={iaPausada ? "IA pausada nesta conversa — clique pra reativar" : "IA respondendo automaticamente — clique pra pausar"}
        >
          {iaPausada ? <BotOff className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
          {iaPausada ? "IA pausada" : "IA ativa"}
        </Button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <div ref={containerRef} onScroll={handleScroll} className="flex h-full flex-col gap-1 overflow-y-auto p-4">
          {mensagens.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>
          )}
          {grupos.map((grupo) => (
            <div key={grupo.dia} className="flex flex-col gap-2">
              <div className="sticky top-0 z-10 mx-auto my-2 w-fit rounded-full bg-secondary px-3 py-1 text-[11px] font-medium text-muted-foreground">
                {formatDiaRelativo(grupo.itens[0].criado_em)}
              </div>
              {grupo.itens.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex max-w-[75%] animate-fade-in flex-col gap-1 rounded-lg px-3 py-2 text-sm",
                    msg.direcao === "saida" ? "self-end bg-primary text-primary-foreground" : "self-start bg-secondary text-foreground"
                  )}
                >
                  {msg.enviado_por_ia && (
                    <Badge variant="secondary" className="w-fit gap-1 bg-white/20 text-[10px] text-inherit">
                      <Bot className="h-3 w-3" />IA
                    </Badge>
                  )}
                  <MidiaMensagem msg={msg} />
                  {msg.conteudo && <span className="whitespace-pre-wrap">{msg.conteudo}</span>}
                  <div className={cn("flex items-center gap-1 text-[10px]", msg.direcao === "saida" ? "text-primary-foreground/70 justify-end" : "text-muted-foreground")}>
                    {formatDateTime(msg.criado_em)}
                    {msg.direcao === "saida" && STATUS_ICON[msg.status_entrega]}
                  </div>
                </div>
              ))}
            </div>
          ))}
          <div ref={fimRef} />
        </div>

        {mostrarBotaoDescer && (
          <button
            type="button"
            onClick={irParaFim}
            className="absolute bottom-3 left-1/2 flex -translate-x-1/2 animate-fade-in items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-popover"
          >
            <ChevronDown className="h-3.5 w-3.5" />
            Ir para mensagem mais recente
          </button>
        )}
      </div>

      {erro && <p className="px-4 text-xs text-danger">{erro}</p>}
      {gravando && <p className="flex items-center gap-1.5 px-4 text-xs text-danger"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-danger" />Gravando áudio...</p>}
      {enviandoAudio && <p className="px-4 text-xs text-muted-foreground">Enviando áudio...</p>}

      <div className="flex items-end gap-2 border-t border-border p-3">
        <SeletorEmoji onSelecionar={(emoji) => setTexto((t) => t + emoji)} />
        <SeletorFotoCatalogo conversaId={conversa.id} telefone={conversa.telefone} />
        {/* Documento continua só recebendo, não enviando — fora do
            escopo desta entrega (ver README). */}
        <Button type="button" variant="ghost" size="icon" disabled title="Documento (em breve)">
          <FileText className="h-4 w-4 text-muted-foreground" />
        </Button>
        <Button
          type="button"
          variant={gravando ? "destructive" : "ghost"}
          size="icon"
          onClick={gravando ? handlePararGravacao : handleIniciarGravacao}
          disabled={enviandoAudio}
          title={gravando ? "Parar e enviar" : "Gravar áudio"}
        >
          {gravando ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4 text-muted-foreground" />}
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

      <AcoesRapidas clienteId={conversa.cliente_id} cardId={conversa.card_id} />
    </div>
  );
}
