"use client";

import { useState, useTransition, useRef, useEffect, useLayoutEffect, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Send, Mic, Square, Check, CheckCheck, Clock, AlertCircle, Bot, BotOff, ChevronDown, ArrowLeft,
  FileText, UserCheck, UserX, MoreHorizontal, Ban, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  enviarMensagemAction, alternarIAPausadaAction, enviarAudioAction, carregarMensagensAnterioresAction,
  definirResponsavelConversaAction, alterarStatusConversaAction,
} from "@/services/whatsapp/whatsapp.actions";
import { useMensagensRealtime } from "@/hooks/use-mensagens-realtime";
import { SeletorEmoji } from "@/components/comunicacao/seletor-emoji";
import { SeletorFotoCatalogo } from "@/components/comunicacao/seletor-foto-catalogo";
import { AssistenteConversa } from "./assistente-conversa";
import { conversaPareceEncerrada } from "@/services/comunicacao/encerramento";
import { AcoesRapidas } from "@/components/comunicacao/acoes-rapidas";
import { nomeDaConversa } from "@/components/comunicacao/conversas-filtro";
import { formatDiaRelativo, formatHora } from "@/utils";
import { formatarTelefone } from "@/lib/telefone";
import type { WhatsappMensagem, StatusEntregaMensagem, StatusConversaWhatsapp } from "@/types";
import type { ConversaComCliente } from "@/services/whatsapp/whatsapp.service";

const STATUS_ICON: Record<StatusEntregaMensagem, { icon: ReactNode; label: string }> = {
  enviando: { icon: <Clock className="h-3 w-3" />, label: "Enviando" },
  enviado: { icon: <Check className="h-3 w-3" />, label: "Enviada" },
  entregue: { icon: <CheckCheck className="h-3 w-3" />, label: "Entregue" },
  lido: { icon: <CheckCheck className="h-3 w-3 text-sky-200" />, label: "Lida" },
  erro: { icon: <AlertCircle className="h-3 w-3" />, label: "Não enviada" },
};

const STATUS_CONVERSA: { value: StatusConversaWhatsapp; label: string }[] = [
  { value: "aberta", label: "Em atendimento" },
  { value: "aguardando_cliente", label: "Aguardando cliente" },
  { value: "resolvida", label: "Resolvida (encerrar)" },
  { value: "perdida", label: "Perdida (encerrar)" },
];

interface ChatPanelProps {
  conversa: ConversaComCliente;
  mensagens: WhatsappMensagem[];
  temMaisAntigas?: boolean;
  usuarioId: string;
  etapa?: { nome: string; cor: string } | null;
}

/** Agrupa mensagens por dia (no fuso de Brasília — ver formatDiaRelativo). */
function agruparPorDia(mensagens: WhatsappMensagem[]): { dia: string; itens: WhatsappMensagem[] }[] {
  const grupos: { dia: string; itens: WhatsappMensagem[] }[] = [];
  for (const msg of mensagens) {
    const dia = formatDiaRelativo(msg.criado_em);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.dia === dia) ultimo.itens.push(msg);
    else grupos.push({ dia, itens: [msg] });
  }
  return grupos;
}

/** URL da mídia sempre passa por aqui — nunca um link fixo salvo no banco (ver rota /api/whatsapp-midia). */
function urlMidia(caminho: string): string {
  return `/api/whatsapp-midia?path=${encodeURIComponent(caminho)}`;
}

function MidiaMensagem({ msg }: { msg: WhatsappMensagem }) {
  if (!msg.url_midia) return null;
  // Foto do catálogo já vem com URL pública completa; áudio e foto recebida
  // ficam no bucket privado (só o caminho é salvo) e passam pela rota de link temporário.
  const src = msg.url_midia.startsWith("http") ? msg.url_midia : urlMidia(msg.url_midia);
  if (msg.tipo === "imagem") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="Imagem enviada na conversa" className="max-w-[240px] rounded-lg" loading="lazy" />;
  }
  if (msg.tipo === "audio") return <audio controls src={src} className="h-9 max-w-[240px]" />;
  return null;
}

export function ChatPanel({ conversa, mensagens: mensagensIniciais, temMaisAntigas = false, usuarioId, etapa }: ChatPanelProps) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isAcaoPending, startAcao] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [iaPausada, setIaPausada] = useState(conversa.ia_pausada);
  const [mostrarBotaoDescer, setMostrarBotaoDescer] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [enviandoAudio, setEnviandoAudio] = useState(false);
  const [antigas, setAntigas] = useState<WhatsappMensagem[]>([]);
  const [temMais, setTemMais] = useState(temMaisAntigas);
  const [carregandoAntigas, setCarregandoAntigas] = useState(false);
  const recentes = useMensagensRealtime(conversa.id, mensagensIniciais);
  // Junta página antiga + recentes + realtime, sem duplicar, sempre em ordem cronológica.
  const mensagens = [...antigas.filter((a) => !recentes.some((r) => r.id === a.id)), ...recentes]
    .sort((a, b) => a.criado_em.localeCompare(b.criado_em));
  const grupos = agruparPorDia(mensagens);
  const naoContatar = conversa.nao_contatar === true;
  const encerrada = conversa.status === "resolvida" || conversa.status === "perdida";
  const souResponsavel = conversa.responsavel_id === usuarioId;
  // Última mensagem do cliente é só "ok/obrigado" depois da nossa resposta? Sugere encerrar (nunca automático).
  const ultima = mensagens[mensagens.length - 1];
  const ultimaSaidaEm = [...mensagens].reverse().find((m) => m.direcao === "saida")?.criado_em ?? null;
  const pareceEncerrada = !!ultima && ultima.direcao === "entrada" && conversaPareceEncerrada({ texto: ultima.conteudo, em: ultima.criado_em }, ultimaSaidaEm);

  const containerRef = useRef<HTMLDivElement>(null);
  const fimRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const totalAnterior = useRef(recentes.length);
  const alturaAntesDeCarregar = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => { setIaPausada(conversa.ia_pausada); }, [conversa.ia_pausada]);
  useEffect(() => { setAntigas([]); setTemMais(temMaisAntigas); }, [conversa.id, temMaisAntigas]);

  // Auto-scroll pra última mensagem — só se a pessoa já estava perto do fim.
  useEffect(() => {
    const chegouNova = recentes.length > totalAnterior.current;
    totalAnterior.current = recentes.length;
    const container = containerRef.current;
    if (!container) return;
    const pertoDoFim = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
    if (pertoDoFim || !chegouNova) {
      fimRef.current?.scrollIntoView({ behavior: chegouNova ? "smooth" : "auto" });
      setMostrarBotaoDescer(false);
    } else {
      setMostrarBotaoDescer(true);
    }
  }, [recentes.length]);

  // Ao carregar mensagens antigas, mantém a posição de leitura (não pula pro topo).
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (container && alturaAntesDeCarregar.current != null) {
      container.scrollTop = container.scrollHeight - alturaAntesDeCarregar.current;
      alturaAntesDeCarregar.current = null;
    }
  }, [antigas.length]);

  // Campo de texto cresce com o conteúdo (até ~6 linhas).
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [texto]);

  function handleScroll() {
    const c = containerRef.current;
    if (c && c.scrollHeight - c.scrollTop - c.clientHeight < 150) setMostrarBotaoDescer(false);
  }

  async function carregarAntigas() {
    const primeira = mensagens[0];
    if (!primeira || carregandoAntigas) return;
    setCarregandoAntigas(true);
    alturaAntesDeCarregar.current = containerRef.current?.scrollHeight ?? null;
    const r = await carregarMensagensAnterioresAction(conversa.id, primeira.criado_em);
    setCarregandoAntigas(false);
    if (!r.success) { alturaAntesDeCarregar.current = null; return setErro(r.error); }
    setAntigas((atual) => [...r.data.mensagens, ...atual]);
    setTemMais(r.data.temMais);
  }

  function handleEnviar() {
    // Enter também chama isto: sem checar `isPending`, Enter repetido com a
    // rede lenta enviava a MESMA mensagem várias vezes ao cliente.
    if (!texto.trim() || isPending) return;
    setErro(null);
    const formData = new FormData();
    formData.set("conversaId", conversa.id);
    formData.set("telefone", conversa.telefone);
    formData.set("texto", texto);
    const enviado = texto;
    startTransition(async () => {
      const result = await enviarMensagemAction(formData);
      // Mandar mensagem manual pausa a IA (regra do backend) — mesmo se o
      // provedor recusou, a tentativa ficou registrada no histórico.
      setIaPausada(true);
      router.refresh();
      if (!result.success) {
        setErro(result.error);
        return; // mantém o texto no campo para tentar de novo
      }
      setTexto((atual) => (atual === enviado ? "" : atual));
    });
  }

  function handleAlternarIA() {
    const novo = !iaPausada;
    setIaPausada(novo);
    startAcao(async () => {
      const r = await alternarIAPausadaAction(conversa.id, novo);
      if (!r.success) { setIaPausada(!novo); setErro(r.error); }
    });
  }

  function executar(acao: () => Promise<{ success: boolean; error?: string }>) {
    setErro(null);
    startAcao(async () => {
      const r = await acao();
      if (!r.success) setErro(r.error ?? "Não foi possível concluir a ação.");
      else router.refresh();
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
        stream.getTracks().forEach((t) => t.stop());
        handleEnviarAudioGravado(new Blob(chunksRef.current, { type: mimeType }));
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setGravando(true);
    } catch {
      setErro("Não foi possível acessar o microfone — confira a permissão do navegador.");
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
      setIaPausada(true);
      router.refresh();
      if (!result.success) setErro(result.error);
    });
  }

  const nome = nomeDaConversa(conversa);
  const telefone = formatarTelefone(conversa.telefone);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Cabeçalho: quem é, onde está no funil, quem atende, e as ações da conversa */}
      <header className="flex items-center gap-2 border-b border-border bg-card px-3 py-2.5 md:px-4">
        <Link href="/comunicacao" className="-ml-1 flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary md:hidden" aria-label="Voltar às conversas">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            {conversa.cliente_id ? (
              <Link href={`/clientes/${conversa.cliente_id}`} className="truncate text-[15px] font-semibold text-foreground hover:underline">{nome}</Link>
            ) : (
              <span className="truncate text-[15px] font-semibold text-foreground">{nome}</span>
            )}
            {etapa && (
              <Link href="/crm" className="hidden shrink-0 items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-foreground hover:bg-secondary/70 sm:inline-flex" title="Etapa no CRM">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: etapa.cor }} aria-hidden />
                {etapa.nome}
              </Link>
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {conversa.cliente ? telefone : "Contato sem cadastro"}
            {" · "}
            {souResponsavel ? "Com você" : conversa.responsavel_id ? "Com outra pessoa da equipe" : "Sem responsável"}
            {encerrada && ` · ${conversa.status === "resolvida" ? "Resolvida" : "Perdida"}`}
          </p>
        </div>

        {conversa.cliente_id && (
          <Button asChild variant="outline" size="sm" className="hidden lg:inline-flex">
            <Link href={`/central-comercial/proposta?conversa=${conversa.id}`}><FileText aria-hidden />Proposta</Link>
          </Button>
        )}
        {!souResponsavel && !encerrada && (
          <Button variant="outline" size="sm" onClick={() => executar(() => definirResponsavelConversaAction(conversa.id, true))} disabled={isAcaoPending} className="hidden sm:inline-flex">
            <UserCheck aria-hidden />Assumir
          </Button>
        )}
        <Button
          type="button"
          variant={iaPausada ? "ghost" : "secondary"}
          size="sm"
          onClick={handleAlternarIA}
          disabled={isAcaoPending || naoContatar}
          title={naoContatar ? "Cliente pediu para não ser contatado — IA desligada" : iaPausada ? "IA pausada nesta conversa — clique para reativar" : "IA respondendo automaticamente — clique para pausar"}
          aria-pressed={!iaPausada}
        >
          {iaPausada ? <BotOff aria-hidden /> : <Bot aria-hidden />}
          <span className="hidden sm:inline">{iaPausada ? "IA pausada" : "IA ativa"}</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Mais ações da conversa"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {conversa.cliente_id && (
              <DropdownMenuItem asChild className="lg:hidden">
                <Link href={`/central-comercial/proposta?conversa=${conversa.id}`}><FileText className="h-4 w-4" />Fazer proposta</Link>
              </DropdownMenuItem>
            )}
            {souResponsavel ? (
              <DropdownMenuItem onClick={() => executar(() => definirResponsavelConversaAction(conversa.id, false))}><UserX className="h-4 w-4" />Liberar conversa</DropdownMenuItem>
            ) : (
              <DropdownMenuItem className="sm:hidden" onClick={() => executar(() => definirResponsavelConversaAction(conversa.id, true))}><UserCheck className="h-4 w-4" />Assumir conversa</DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Status do atendimento</DropdownMenuLabel>
            {STATUS_CONVERSA.map((s) => (
              <DropdownMenuItem key={s.value} disabled={conversa.status === s.value} onClick={() => executar(() => alterarStatusConversaAction(conversa.id, s.value))}>
                {conversa.status === s.value ? <Check className="h-4 w-4" /> : <span className="h-4 w-4" />}
                {s.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {naoContatar && (
        <div className="flex items-center gap-2 border-b border-danger/20 bg-danger-soft px-4 py-2 text-xs text-danger" role="status">
          <Ban className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Este cliente pediu para não ser contatado. A IA e os follow-ups automáticos estão desligados.
        </div>
      )}

      <div className="relative min-h-0 flex-1">
        <div ref={containerRef} onScroll={handleScroll} className="flex h-full flex-col gap-1 overflow-y-auto px-3 py-4 md:px-6" aria-live="polite" aria-relevant="additions">
          {temMais && (
            <button type="button" onClick={carregarAntigas} disabled={carregandoAntigas} className="mx-auto mb-2 flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-card hover:text-foreground disabled:opacity-60">
              {carregandoAntigas && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
              Carregar mensagens anteriores
            </button>
          )}
          {mensagens.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>}
          {grupos.map((grupo) => (
            <div key={grupo.dia + grupo.itens[0].id} className="flex flex-col gap-1.5">
              <div className="sticky top-0 z-10 mx-auto my-2 w-fit rounded-full bg-card/90 px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-card backdrop-blur">
                {grupo.dia}
              </div>
              {grupo.itens.map((msg) => {
                const saida = msg.direcao === "saida";
                const falhou = saida && msg.status_entrega === "erro";
                const st = STATUS_ICON[msg.status_entrega];
                return (
                  <div key={msg.id} className={cn("flex max-w-[82%] flex-col md:max-w-[68%]", saida ? "items-end self-end" : "items-start self-start")}>
                    <div
                      className={cn(
                        "flex flex-col gap-1 rounded-2xl px-3.5 py-2 text-[14px] leading-snug",
                        saida ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-card text-foreground shadow-card",
                        falhou && "bg-danger-soft text-foreground ring-1 ring-danger/30"
                      )}
                    >
                      {msg.enviado_por_ia && (
                        <span className={cn("flex w-fit items-center gap-1 text-[10px] font-medium uppercase tracking-wide", saida && !falhou ? "text-primary-foreground/75" : "text-muted-foreground")}>
                          <Bot className="h-3 w-3" aria-hidden />Enviada pela IA
                        </span>
                      )}
                      <MidiaMensagem msg={msg} />
                      {msg.conteudo && <span className="whitespace-pre-wrap break-words">{msg.conteudo}</span>}
                      <span className={cn("flex items-center gap-1 self-end text-[10px] tabular-nums", saida && !falhou ? "text-primary-foreground/70" : "text-muted-foreground")}>
                        <time dateTime={msg.criado_em}>{formatHora(msg.criado_em)}</time>
                        {saida && <span className="flex items-center" title={st.label} aria-label={st.label}>{st.icon}</span>}
                      </span>
                    </div>
                    {falhou && (
                      <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-danger">
                        <AlertCircle className="h-3 w-3" aria-hidden />Não enviada — o cliente não recebeu esta mensagem
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          <div ref={fimRef} />
        </div>

        {mostrarBotaoDescer && (
          <button
            type="button"
            onClick={() => { fimRef.current?.scrollIntoView({ behavior: "smooth" }); setMostrarBotaoDescer(false); }}
            className="absolute bottom-3 left-1/2 flex -translate-x-1/2 animate-fade-in items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-background shadow-popover"
          >
            <ChevronDown className="h-3.5 w-3.5" aria-hidden />Nova mensagem
          </button>
        )}
      </div>

      <div className="border-t border-border bg-card">
        {erro && <p className="flex items-start gap-1.5 px-4 pt-2 text-xs text-danger" role="alert"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />{erro}</p>}
        {gravando && <p className="flex items-center gap-1.5 px-4 pt-2 text-xs text-danger"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-danger" />Gravando áudio… toque em parar para enviar</p>}
        {enviandoAudio && <p className="px-4 pt-2 text-xs text-muted-foreground">Enviando áudio…</p>}

        <AssistenteConversa
          conversaId={conversa.id}
          clienteId={conversa.cliente_id}
          nomeCliente={conversa.cliente?.nome ?? ""}
          pareceEncerrada={pareceEncerrada}
          encerrada={encerrada}
          encerrando={isAcaoPending}
          onEncerrar={() => executar(() => alterarStatusConversaAction(conversa.id, "resolvida"))}
          onInserir={(t) => { setTexto((atual) => (atual.trim() ? `${atual.trimEnd()} ${t}` : t)); requestAnimationFrame(() => textareaRef.current?.focus()); }}
        />

        <div className="flex items-end gap-1 p-2 md:gap-2 md:p-3">
          <SeletorEmoji onSelecionar={(emoji) => setTexto((t) => t + emoji)} />
          <SeletorFotoCatalogo conversaId={conversa.id} telefone={conversa.telefone} />
          <Button
            type="button"
            variant={gravando ? "destructive" : "ghost"}
            size="icon"
            onClick={gravando ? handlePararGravacao : handleIniciarGravacao}
            disabled={enviandoAudio}
            aria-label={gravando ? "Parar e enviar áudio" : "Gravar áudio"}
            title={gravando ? "Parar e enviar" : "Gravar áudio"}
          >
            {gravando ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4 text-muted-foreground" />}
          </Button>
          <textarea
            ref={textareaRef}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                handleEnviar();
              }
            }}
            placeholder="Mensagem"
            title="Enter envia · Shift+Enter quebra a linha"
            aria-label="Mensagem"
            rows={1}
            className="max-h-40 min-h-10 flex-1 resize-none rounded-2xl border border-input bg-background px-3.5 py-2.5 text-sm leading-snug outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button type="button" size="icon" className="rounded-full" onClick={handleEnviar} disabled={isPending || !texto.trim()} aria-label="Enviar mensagem">
            {isPending && !enviandoAudio ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>

        <AcoesRapidas clienteId={conversa.cliente_id} cardId={conversa.card_id} />
      </div>
    </div>
  );
}
