"use client";

import { useState, useTransition, useRef, useEffect, useLayoutEffect, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Send, Mic, Square, Check, CheckCheck, Clock, AlertCircle, Bot, BotOff, ChevronDown, ArrowLeft,
  UserCheck, UserX, MoreHorizontal, Ban, Loader2, Plus, UserRound, RotateCcw, Camera, Paperclip,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { reduzir } from "@/components/celular/fotos-upload";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  enviarMensagemAction, enviarFotoAction, alternarIAPausadaAction, enviarAudioAction, carregarMensagensAnterioresAction,
  definirResponsavelConversaAction, alterarStatusConversaAction,
} from "@/services/whatsapp/whatsapp.actions";
import { useMensagensRealtime } from "@/hooks/use-mensagens-realtime";
import { SeletorEmoji } from "@/components/comunicacao/seletor-emoji";
import { SeletorFotoCatalogo } from "@/components/comunicacao/seletor-foto-catalogo";
import { AssistenteConversa } from "./assistente-conversa";
import { conversaPareceEncerrada } from "@/services/comunicacao/encerramento";
import { ClienteInfoConteudo } from "@/components/comunicacao/cliente-info-panel";
import type { ResumoClienteAtendimento } from "@/services/comunicacao/comunicacao-cliente-resumo.service";
import { nomeDaConversa } from "@/components/comunicacao/conversas-filtro";
import { formatDiaRelativo, formatHora, getInitials } from "@/utils";
import { formatarTelefone } from "@/lib/telefone";
import type { WhatsappMensagem, StatusEntregaMensagem, StatusConversaWhatsapp } from "@/types";
import type { ConversaComCliente } from "@/services/whatsapp/whatsapp.service";

const STATUS_ICON: Record<StatusEntregaMensagem, { icon: ReactNode; label: string }> = {
  enviando: { icon: <Clock className="h-3 w-3" />, label: "Enviando" },
  enviado: { icon: <Check className="h-3 w-3" />, label: "Enviada" },
  entregue: { icon: <CheckCheck className="h-3 w-3" />, label: "Entregue" },
  lido: { icon: <CheckCheck className="h-3 w-3 text-sky-500" />, label: "Lida" },
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
  /** Painel do cliente: ao lado no computador; no celular abre pelo cabeçalho. */
  resumo: ResumoClienteAtendimento;
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

/** Só emoji (até 3), como "😭": aparece grande e sem balão, igual no WhatsApp. */
function soEmoji(texto: string | null): boolean {
  if (!texto) return false;
  const t = texto.trim();
  if (!t || t.length > 24) return false;
  const semEmoji = t.replace(/\p{Extended_Pictographic}|\p{Emoji_Modifier}|\p{Regional_Indicator}|\u200d|\ufe0f|\s/gu, "");
  if (semEmoji.length > 0) return false;
  return (t.match(/\p{Extended_Pictographic}|\p{Regional_Indicator}{2}/gu) ?? []).length <= 3;
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

export function ChatPanel({ conversa, mensagens: mensagensIniciais, temMaisAntigas = false, usuarioId, etapa, resumo }: ChatPanelProps) {
  const [menuAberto, setMenuAberto] = useState(false);
  const [fotoAberta, setFotoAberta] = useState(false);
  const [clienteAberto, setClienteAberto] = useState(false);
  // Foto do aparelho (câmera ou galeria/computador).
  const inputFotoRef = useRef<HTMLInputElement>(null);
  const inputCameraRef = useRef<HTMLInputElement>(null);
  const [fotoParaEnviar, setFotoParaEnviar] = useState<{ arquivo: File; previa: string } | null>(null);
  const [legendaFoto, setLegendaFoto] = useState("");
  const [erroFoto, setErroFoto] = useState<string | null>(null);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  function escolherFoto(lista: FileList | null) {
    const arquivo = lista?.[0];
    if (inputFotoRef.current) inputFotoRef.current.value = "";
    if (inputCameraRef.current) inputCameraRef.current.value = "";
    if (!arquivo || !arquivo.type.startsWith("image/")) return;
    setErroFoto(null);
    setLegendaFoto("");
    setFotoParaEnviar({ arquivo, previa: URL.createObjectURL(arquivo) });
  }
  function fecharFoto() {
    if (fotoParaEnviar) URL.revokeObjectURL(fotoParaEnviar.previa);
    setFotoParaEnviar(null);
  }
  async function enviarFoto() {
    if (!fotoParaEnviar) return;
    setEnviandoFoto(true);
    setErroFoto(null);
    try {
      const reduzida = await reduzir(fotoParaEnviar.arquivo);
      const formData = new FormData();
      formData.set("conversaId", conversa.id);
      formData.set("telefone", conversa.telefone);
      formData.set("legenda", legendaFoto);
      formData.set("foto", new File([reduzida], "foto.jpg", { type: reduzida.type || "image/jpeg" }));
      const r = await enviarFotoAction(formData);
      setIaPausada(true);
      router.refresh();
      if (!r.success) return setErroFoto(r.error);
      fecharFoto();
    } catch (err) {
      setErroFoto(err instanceof Error ? err.message : "Não foi possível preparar a foto.");
    } finally {
      setEnviandoFoto(false);
    }
  }
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

  // Rascunho por conversa (fica no aparelho): sinal ruim, troca de conversa ou app
  // fechado no celular não perdem o que estava sendo digitado. O efeito que salva
  // vem antes do que carrega para não gravar o texto da conversa anterior na nova.
  const rascunhoDe = useRef<string | null>(null);
  useEffect(() => {
    if (rascunhoDe.current !== conversa.id) return;
    // localStorage pode estar bloqueado (aba anônima): sem rascunho, o envio segue normal.
    try {
      if (texto) localStorage.setItem(`neotec:rascunho:${conversa.id}`, texto);
      else localStorage.removeItem(`neotec:rascunho:${conversa.id}`);
    } catch { /* sem armazenamento local neste navegador */ }
  }, [texto, conversa.id]);
  useEffect(() => {
    let salvo = "";
    try { salvo = localStorage.getItem(`neotec:rascunho:${conversa.id}`) ?? ""; } catch { /* sem armazenamento local */ }
    setTexto(salvo);
    rascunhoDe.current = conversa.id;
  }, [conversa.id]);
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
        {/* No celular, tocar no nome/foto abre o painel do cliente (como "dados do contato" no WhatsApp). */}
        <button type="button" onClick={() => setClienteAberto(true)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground lg:pointer-events-none" aria-label="Ver dados do cliente" tabIndex={-1}>
          {conversa.cliente?.nome ? getInitials(conversa.cliente.nome) : "#"}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <button type="button" onClick={() => setClienteAberto(true)} className="truncate text-left text-[15px] font-semibold text-foreground lg:hidden">{nome}</button>
            {conversa.cliente_id ? (
              <Link href={`/clientes/${conversa.cliente_id}`} className="hidden truncate text-[15px] font-semibold text-foreground hover:underline lg:inline">{nome}</Link>
            ) : (
              <span className="hidden truncate text-[15px] font-semibold text-foreground lg:inline">{nome}</span>
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
            <DropdownMenuItem className="lg:hidden" onClick={() => setClienteAberto(true)}><UserRound className="h-4 w-4" />Dados do cliente</DropdownMenuItem>
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
            <div key={grupo.dia + grupo.itens[0].id} className="flex flex-col gap-1">
              {/* Separador de dia fixo no lugar (antes ficava grudado no topo, por cima do texto das mensagens). */}
              <div className="mx-auto my-2 w-fit rounded-lg bg-card/90 px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-card">
                {grupo.dia}
              </div>
              {grupo.itens.map((msg, idx) => {
                const saida = msg.direcao === "saida";
                const falhou = saida && msg.status_entrega === "erro";
                const st = STATUS_ICON[msg.status_entrega];
                const anterior = grupo.itens[idx - 1];
                const continuacao = anterior && anterior.direcao === msg.direcao;
                const emoji = !msg.url_midia && !msg.citacao_texto && soEmoji(msg.conteudo);
                const citada = msg.citacao_whatsapp_id ? mensagens.find((m) => m.whatsapp_message_id === msg.citacao_whatsapp_id) : undefined;
                // Sem a mensagem original carregada não dá para saber quem escreveu: não chuta.
                const autorCitacao = citada ? (citada.direcao === "saida" ? "Você" : nome) : "Mensagem citada";
                const hora = (
                  <>
                    <time dateTime={msg.criado_em}>{formatHora(msg.criado_em)}</time>
                    {saida && <span className="flex items-center" title={st.label} aria-label={st.label}>{st.icon}</span>}
                  </>
                );
                return (
                  <div key={msg.id} className={cn("flex max-w-[85%] flex-col md:max-w-[68%]", saida ? "items-end self-end" : "items-start self-start", !continuacao && "mt-1.5")}>
                    {emoji ? (
                      <div className="flex flex-col items-end">
                        <span className="text-5xl leading-tight" role="img" aria-label={msg.conteudo ?? ""}>{msg.conteudo}</span>
                        <span className="mt-0.5 flex items-center gap-1 rounded-full bg-card/90 px-2 py-0.5 text-[10px] tabular-nums text-muted-foreground shadow-card">{hora}</span>
                      </div>
                    ) : (
                    <div
                      className={cn(
                        // Balão claro com texto escuro (mais confortável de ler o dia todo, como no WhatsApp).
                        "relative flex flex-col gap-1 rounded-2xl px-3 py-1.5 text-[15px] leading-snug text-foreground shadow-card",
                        saida ? "bg-[#dce6ff] dark:bg-primary/30" : "bg-card",
                        !continuacao && (saida ? "rounded-tr-md" : "rounded-tl-md"),
                        falhou && "bg-danger-soft ring-1 ring-danger/30"
                      )}
                    >
                      {msg.enviado_por_ia && (
                        <span className="flex w-fit items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          <Bot className="h-3 w-3" aria-hidden />Enviada pela IA
                        </span>
                      )}
                      {msg.citacao_texto && (
                        <div className={cn("rounded-lg border-l-4 px-2.5 py-1.5 text-[13px]", saida ? "border-primary/60 bg-white/50" : "border-primary bg-secondary/70")}>
                          <span className="block text-[12px] font-semibold text-primary">{autorCitacao}</span>
                          <span className="line-clamp-3 whitespace-pre-wrap break-words text-muted-foreground">{msg.citacao_texto}</span>
                        </div>
                      )}
                      <MidiaMensagem msg={msg} />
                      {msg.conteudo ? (
                        <span className="whitespace-pre-wrap break-words">
                          {msg.conteudo}
                          {/* Espaço reservado para a hora caber na última linha, como no WhatsApp. */}
                          <span className={cn("inline-block", saida ? "w-[4.25rem]" : "w-11")} aria-hidden />
                        </span>
                      ) : null}
                      <span className={cn("flex items-center gap-1 text-[11px] tabular-nums text-muted-foreground", msg.conteudo ? "absolute bottom-1 right-2.5" : "self-end")}>
                        {hora}
                      </span>
                    </div>
                    )}
                    {falhou && (
                      <span className="mt-1 flex flex-wrap items-center justify-end gap-x-2 gap-y-1 text-[11px] font-medium text-danger">
                        <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3" aria-hidden />Não enviada — o cliente não recebeu esta mensagem</span>
                        {msg.conteudo && (
                          <button type="button" onClick={() => { setTexto(msg.conteudo ?? ""); requestAnimationFrame(() => textareaRef.current?.focus()); }} className="flex items-center gap-1 rounded-full bg-card px-2 py-0.5 text-foreground shadow-card">
                            <RotateCcw className="h-3 w-3" aria-hidden />Tentar de novo
                          </button>
                        )}
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
          telefone={conversa.telefone}
          pareceEncerrada={pareceEncerrada}
          encerrada={encerrada}
          encerrando={isAcaoPending}
          onEncerrar={() => executar(() => alterarStatusConversaAction(conversa.id, "resolvida"))}
          onInserir={(t) => { setTexto((atual) => (atual.trim() ? `${atual.trimEnd()} ${t}` : t)); requestAnimationFrame(() => textareaRef.current?.focus()); }}
          menuAberto={menuAberto}
          onMenuAberto={setMenuAberto}
          onFotoCatalogo={() => setFotoAberta(true)}
          onAbrirCliente={() => setClienteAberto(true)}
        />

        <div className="flex items-end gap-1 p-2 md:gap-2 md:p-3">
          {/* Celular: "+" abre as ferramentas (como o anexo do WhatsApp); emoji fica no teclado do aparelho. */}
          <Button type="button" variant="ghost" size="icon" className="md:hidden" onClick={() => setMenuAberto(true)} aria-label="Ferramentas: atender, proposta, troca, catálogo, respostas">
            <Plus className="h-5 w-5 text-muted-foreground" />
          </Button>
          <div className="hidden md:block"><SeletorEmoji onSelecionar={(emoji) => setTexto((t) => t + emoji)} /></div>
          <SeletorFotoCatalogo conversaId={conversa.id} telefone={conversa.telefone} aberto={fotoAberta} onAbertoChange={setFotoAberta} classeBotao="hidden md:inline-flex" />
          <input ref={inputFotoRef} type="file" accept="image/*" className="sr-only" onChange={(e) => escolherFoto(e.target.files)} aria-label="Escolher foto para enviar" />
          <input ref={inputCameraRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => escolherFoto(e.target.files)} aria-label="Tirar foto para enviar" />
          <Button type="button" variant="ghost" size="icon" className="hidden md:inline-flex" onClick={() => inputFotoRef.current?.click()} aria-label="Enviar foto do computador" title="Enviar foto do computador">
            <Paperclip className="h-4 w-4 text-muted-foreground" />
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
            className="max-h-40 min-h-10 flex-1 resize-none rounded-3xl border border-input bg-background px-4 py-2.5 text-sm leading-snug outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
          {/* Como no WhatsApp: câmera e microfone à direita; ao digitar, o microfone vira "enviar". */}
          <Button type="button" variant="ghost" size="icon" className={cn("md:hidden", texto.trim() && "hidden")} onClick={() => inputCameraRef.current?.click()} aria-label="Tirar foto e enviar">
            <Camera className="h-5 w-5 text-muted-foreground" />
          </Button>
          <Button
            type="button"
            variant={gravando ? "destructive" : "default"}
            size="icon"
            className={cn("rounded-full", texto.trim() && !gravando && "max-md:hidden", !gravando && "md:bg-transparent md:text-muted-foreground md:hover:bg-secondary")}
            onClick={gravando ? handlePararGravacao : handleIniciarGravacao}
            disabled={enviandoAudio}
            aria-label={gravando ? "Parar e enviar áudio" : "Gravar áudio"}
            title={gravando ? "Parar e enviar" : "Gravar áudio"}
          >
            {gravando ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          <Button type="button" size="icon" className={cn("rounded-full", !texto.trim() && "max-md:hidden")} onClick={handleEnviar} disabled={isPending || !texto.trim()} aria-label="Enviar mensagem">
            {isPending && !enviandoAudio ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Foto escolhida: confere e põe legenda antes de mandar (nada sai sem confirmar). */}
      <Dialog open={!!fotoParaEnviar} onOpenChange={(v) => { if (!v && !enviandoFoto) fecharFoto(); }}>
        <DialogContent className="max-w-md p-4">
          <DialogTitle className="text-base font-semibold">Enviar foto para {nome}</DialogTitle>
          {fotoParaEnviar && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fotoParaEnviar.previa} alt="Foto que será enviada" className="max-h-[50dvh] w-full rounded-lg bg-secondary object-contain" />
          )}
          <Input value={legendaFoto} onChange={(e) => setLegendaFoto(e.target.value)} placeholder="Legenda (opcional)" aria-label="Legenda da foto" />
          {erroFoto && <p role="alert" className="text-sm text-danger">{erroFoto}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={fecharFoto} disabled={enviandoFoto}>Cancelar</Button>
            <Button type="button" onClick={enviarFoto} disabled={enviandoFoto}>{enviandoFoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{enviandoFoto ? "Enviando…" : "Enviar"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Sheet open={clienteAberto} onOpenChange={setClienteAberto}>
        <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-sm">
          <SheetTitle className="border-b border-border px-4 py-3 text-[15px] font-semibold">Dados do cliente</SheetTitle>
          <ClienteInfoConteudo resumo={resumo} conversaId={conversa.id} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
