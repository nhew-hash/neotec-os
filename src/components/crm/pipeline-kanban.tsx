"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MessageCircle, Clock, AlertTriangle, Sparkles, RotateCcw, Trash2, MoreHorizontal, Search, X, Wrench, ArrowRightLeft, Hourglass, Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  moverCardEtapaAction, marcarCardPerdidoAction, reabrirCardAction, excluirCardAction, moverParaCrmAssistenciaAction,
} from "@/services/crm-pipeline/crm-pipeline.actions";
import { formatCurrency, getInitials } from "@/utils";
import { cn } from "@/lib/utils";
import { FILTROS_PADRAO, filtrarCards, resumoColuna, diasNaEtapa, cardEstaParado, type FiltrosPipeline } from "./crm-filtro";
import type { CrmEtapa, TemperaturaLead } from "@/types";
import type { CardComRelacoes } from "@/services/crm-pipeline/crm-pipeline.service";

const ORIGEM_LABEL: Record<string, string> = {
  instagram: "Instagram", google: "Google", indicacao: "Indicação",
  loja_fisica: "Loja física", shopify: "Shopify", outros: "Outros",
};

const TEMPERATURA: Record<TemperaturaLead, { label: string; ponto: string }> = {
  quente: { label: "Quente", ponto: "bg-danger" },
  morno: { label: "Morno", ponto: "bg-warning" },
  frio: { label: "Frio", ponto: "bg-sky-500" },
};

function CardItem({ card, etapas, usuarioId, onErro }: { card: CardComRelacoes; etapas: CrmEtapa[]; usuarioId: string; onErro: (m: string | null) => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pedindoMotivo, setPedindoMotivo] = useState(false);
  const [motivo, setMotivo] = useState("");
  const temperatura = TEMPERATURA[card.cliente.temperatura] ?? TEMPERATURA.frio;
  const etapa = etapas.find((e) => e.id === card.etapa_id);
  const dias = diasNaEtapa(card.entrou_etapa_em, new Date());
  const parado = cardEstaParado(card, etapa ? { id: etapa.id, dias_para_alerta: etapa.dias_para_alerta ?? null } : undefined, new Date());

  // Toda ação confere o resultado: antes, erros de mover/perder/reabrir/excluir eram silenciosos.
  function executar(acao: () => Promise<{ success: boolean; error?: string }>) {
    onErro(null);
    startTransition(async () => {
      const r = await acao();
      if (!r.success) onErro(r.error ?? "Não foi possível concluir a ação.");
      else router.refresh();
    });
  }

  function confirmarPerda() {
    if (!motivo.trim()) return;
    setPedindoMotivo(false);
    executar(() => marcarCardPerdidoAction(card.id, motivo.trim()));
    setMotivo("");
  }

  function excluir() {
    if (!window.confirm(`Excluir a oportunidade de "${card.cliente.nome}"? Não pode ser desfeito — tags, follow-ups e score desse card somem junto. A conversa de WhatsApp continua, só desvinculada.\n\nPara manter o histórico, prefira "Marcar como perdida".`)) return;
    executar(() => excluirCardAction(card.id));
  }

  function moverParaAssistencia() {
    const defeito = window.prompt("Qual o defeito relatado pelo cliente?");
    if (defeito == null || !defeito.trim()) return;
    executar(() => moverParaCrmAssistenciaAction(card.id, card.cliente.id, defeito.trim()));
  }

  return (
    <article
      className={cn(
        "group flex flex-col gap-2 rounded-xl border border-border bg-card p-3 shadow-card transition-shadow hover:shadow-card-hover",
        card.perdido && "opacity-60",
        isPending && "pointer-events-none opacity-70"
      )}
      aria-busy={isPending}
    >
      <div className="flex items-start gap-2">
        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-foreground">
          {getInitials(card.cliente.nome)}
          <span className={cn("absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-card", temperatura.ponto)} title={`Lead ${temperatura.label.toLowerCase()}`} />
        </div>
        <div className="min-w-0 flex-1">
          <Link href={`/clientes/${card.cliente.id}`} className="block truncate text-sm font-semibold text-foreground hover:underline">{card.cliente.nome}</Link>
          <p className="line-clamp-2 text-xs text-muted-foreground">{card.titulo}</p>
        </div>
        <div className="flex shrink-0 items-center">
          {card.conversa && (
            <Link href={`/comunicacao/${card.conversa.id}`} className="relative flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-primary" title="Abrir conversa" aria-label="Abrir conversa">
              <MessageCircle className="h-4 w-4" />
              {card.conversa.naoLidas > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground">{card.conversa.naoLidas}</span>
              )}
            </Link>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Ações da oportunidade">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {card.perdido ? (
                <DropdownMenuItem onClick={() => executar(() => reabrirCardAction(card.id))}><RotateCcw className="h-4 w-4" />Reabrir</DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => setPedindoMotivo(true)}><X className="h-4 w-4" />Marcar como perdida</DropdownMenuItem>
              )}
              {!card.convertido_em_os_id && <DropdownMenuItem onClick={moverParaAssistencia}><Wrench className="h-4 w-4" />Na verdade é assistência</DropdownMenuItem>}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={excluir} className="text-danger focus:text-danger"><Trash2 className="h-4 w-4" />Excluir definitivamente</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {card.resumo_ia && (
        <p className="flex items-start gap-1.5 rounded-lg bg-accent px-2 py-1.5 text-[11px] text-accent-foreground">
          <Sparkles className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
          <span><span className="font-medium">Sugestão da IA: </span>{card.resumo_ia}</span>
        </p>
      )}

      <p className="text-xs">
        <span className="font-medium text-foreground">Próxima ação: </span>
        <span className={card.proxima_acao ? "text-foreground" : "text-muted-foreground"}>{card.proxima_acao ?? "não definida"}</span>
      </p>

      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5", parado ? "bg-warning-soft font-medium text-warning-text" : "bg-secondary text-muted-foreground")} title={parado ? `Passou do alerta da etapa (${etapa?.dias_para_alerta} dia[s])` : "Tempo nesta etapa"}>
          {parado ? <Hourglass className="h-3 w-3" aria-hidden /> : <Clock className="h-3 w-3" aria-hidden />}
          {dias === 0 ? "hoje" : `${dias}d na etapa`}
        </span>
        {card.objecao && (
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-warning-text"><AlertTriangle className="h-3 w-3" aria-hidden />{card.objecao === "preco" ? "Preço" : card.objecao}</span>
        )}
        {card.origem && <span className="rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">{ORIGEM_LABEL[card.origem] ?? card.origem}</span>}
        {card.score > 0 && <span className="inline-flex items-center gap-0.5 rounded-full bg-secondary px-2 py-0.5 tabular-nums text-muted-foreground" title={`Lead score: ${card.score}`}><Flame className="h-3 w-3" aria-hidden />{card.score}</span>}
        {card.status_recuperacao === "sem_retorno" && <span className="rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">Sem retorno</span>}
        {card.status_recuperacao === "recuperado" && <span className="rounded-full bg-success-soft px-2 py-0.5 text-success-text">Recuperado</span>}
        {card.tags.map((tag) => <span key={tag.id} className="rounded-full bg-secondary px-2 py-0.5" style={{ color: tag.cor }}>{tag.nome}</span>)}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border/70 pt-2 text-[11px] text-muted-foreground">
        <span className="truncate">{card.responsavel_id === usuarioId ? "Com você" : card.responsavel?.nome ?? (card.responsavel_id ? "Equipe" : "Sem responsável")}</span>
        {card.valor_estimado != null && <span className="font-medium tabular-nums text-foreground">{formatCurrency(card.valor_estimado)}</span>}
      </div>

      {card.perdido && card.motivo_perda && <p className="text-[11px] text-muted-foreground">Perdida: {card.motivo_perda}</p>}

      {pedindoMotivo && (
        <div className="flex items-center gap-1">
          <Input autoFocus value={motivo} onChange={(e) => setMotivo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && confirmarPerda()} placeholder="Motivo (ex.: preço, comprou em outro lugar)" className="h-8 text-xs" aria-label="Motivo da perda" />
          <Button type="button" size="sm" onClick={confirmarPerda} disabled={!motivo.trim()}>OK</Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPedindoMotivo(false)} aria-label="Cancelar"><X className="h-3.5 w-3.5" /></Button>
        </div>
      )}

      {!card.perdido && (
        <Select value={card.etapa_id} disabled={isPending} onValueChange={(etapaId) => executar(() => moverCardEtapaAction(card.id, etapaId))}>
          <SelectTrigger className="h-8 text-xs" aria-label="Mover para a etapa"><ArrowRightLeft className="mr-1 h-3 w-3 text-muted-foreground" aria-hidden /><SelectValue /></SelectTrigger>
          <SelectContent>{etapas.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}</SelectContent>
        </Select>
      )}
    </article>
  );
}

export function PipelineKanban({ etapas, cards, usuarioId, filtrosIniciais }: { etapas: CrmEtapa[]; cards: CardComRelacoes[]; usuarioId: string; filtrosIniciais?: Partial<FiltrosPipeline> }) {
  const [f, setF] = useState<FiltrosPipeline>({ ...FILTROS_PADRAO, ...filtrosIniciais });
  const [erro, setErro] = useState<string | null>(null);
  const visiveis = useMemo(() => filtrarCards(cards, etapas, f, usuarioId, new Date()), [cards, etapas, f, usuarioId]);
  const total = resumoColuna(visiveis);
  const algumFiltro = JSON.stringify(f) !== JSON.stringify(FILTROS_PADRAO);
  const alertaConfigurado = etapas.some((e) => e.dias_para_alerta != null);

  const Chip = ({ ativo, onClick, children, title }: { ativo: boolean; onClick: () => void; children: React.ReactNode; title?: string }) => (
    <button type="button" onClick={onClick} aria-pressed={ativo} title={title} className={cn("flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors", ativo ? "bg-foreground text-background" : "bg-card text-muted-foreground ring-1 ring-border hover:text-foreground")}>
      {children}
    </button>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative lg:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={f.busca} onChange={(e) => setF({ ...f, busca: e.target.value })} placeholder="Cliente, telefone ou oportunidade" className="h-9 pl-9" aria-label="Buscar no pipeline" />
        </div>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 py-0.5 neotec-scroll-x">
          <Chip ativo={f.somenteMinhas} onClick={() => setF({ ...f, somenteMinhas: !f.somenteMinhas })}>Minhas</Chip>
          <Chip ativo={f.somenteParadas} onClick={() => setF({ ...f, somenteParadas: !f.somenteParadas })} title={alertaConfigurado ? "Passaram do alerta configurado na etapa" : "Nenhuma etapa tem “dias para alerta” configurado"}>
            <Hourglass className="h-3 w-3" aria-hidden />Paradas
          </Chip>
          <Chip ativo={f.mostrarPerdidas} onClick={() => setF({ ...f, mostrarPerdidas: !f.mostrarPerdidas })}>Mostrar perdidas</Chip>
          <select value={f.origem} onChange={(e) => setF({ ...f, origem: e.target.value })} className="h-8 shrink-0 rounded-full bg-card px-3 text-xs font-medium text-muted-foreground ring-1 ring-border" aria-label="Origem">
            <option value="">Todas as origens</option>
            {Object.entries(ORIGEM_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select value={f.temperatura} onChange={(e) => setF({ ...f, temperatura: e.target.value })} className="h-8 shrink-0 rounded-full bg-card px-3 text-xs font-medium text-muted-foreground ring-1 ring-border" aria-label="Temperatura">
            <option value="">Todas as temperaturas</option>
            {Object.entries(TEMPERATURA).map(([v, t]) => <option key={v} value={v}>{t.label}</option>)}
          </select>
          {algumFiltro && <button type="button" onClick={() => setF(FILTROS_PADRAO)} className="h-8 shrink-0 px-2 text-xs font-medium text-primary hover:underline">Limpar</button>}
        </div>
        <p className="text-xs text-muted-foreground lg:ml-auto">
          <span className="font-medium tabular-nums text-foreground">{total.quantidade}</span> oportunidade(s)
          {total.valor > 0 && <> · <span className="font-medium tabular-nums text-foreground">{formatCurrency(total.valor)}</span> estimado</>}
        </p>
      </div>

      {f.somenteParadas && !alertaConfigurado && (
        <p className="rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning-text">Nenhuma etapa tem “dias para alerta” configurado, então nenhuma oportunidade é considerada parada. Configure nas etapas do CRM.</p>
      )}
      {erro && <p className="flex items-center gap-1.5 rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger" role="alert"><AlertTriangle className="h-3.5 w-3.5" aria-hidden />{erro}</p>}

      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-3 md:-mx-8 md:px-8">
        {etapas.map((etapa) => {
          const itens = visiveis.filter((c) => c.etapa_id === etapa.id);
          const resumo = resumoColuna(itens);
          return (
            <section key={etapa.id} className="flex w-[280px] shrink-0 flex-col gap-2 rounded-2xl bg-secondary/60 p-2" aria-label={`Etapa ${etapa.nome}`}>
              <header className="flex items-center justify-between gap-2 px-1.5 pt-1">
                <h3 className="flex min-w-0 items-center gap-1.5 text-[13px] font-semibold text-foreground">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: etapa.cor }} aria-hidden />
                  <span className="truncate">{etapa.nome}</span>
                  <span className="font-normal tabular-nums text-muted-foreground">{resumo.quantidade}</span>
                </h3>
                {resumo.valor > 0 && <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{formatCurrency(resumo.valor)}</span>}
              </header>
              <div className="flex flex-col gap-2">
                {itens.map((card) => <CardItem key={card.id} card={card} etapas={etapas} usuarioId={usuarioId} onErro={setErro} />)}
                {itens.length === 0 && <div className="rounded-xl border border-dashed border-border py-8 text-center text-xs text-muted-foreground">Nenhuma oportunidade</div>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
