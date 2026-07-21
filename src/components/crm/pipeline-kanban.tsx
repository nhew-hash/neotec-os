"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { MessageCircle, Clock, Flame, AlertTriangle, Sparkles, X, RotateCcw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { moverCardEtapaAction, marcarCardPerdidoAction, reabrirCardAction } from "@/services/crm-pipeline/crm-pipeline.actions";
import { formatCurrency, formatWhatsapp, formatDateTime, getInitials } from "@/utils";
import { cn } from "@/lib/utils";
import type { CrmEtapa, TemperaturaLead } from "@/types";
import type { CardComRelacoes } from "@/services/crm-pipeline/crm-pipeline.service";

const ORIGEM_LABEL: Record<string, string> = {
  instagram: "Instagram", google: "Google", indicacao: "Indicação",
  loja_fisica: "Loja física", shopify: "Shopify", outros: "Outros",
};

const TEMPERATURA_CONFIG: Record<TemperaturaLead, { label: string; tone: "danger" | "warning" | "info"; borda: string }> = {
  quente: { label: "Quente", tone: "danger", borda: "border-l-danger" },
  morno: { label: "Morno", tone: "warning", borda: "border-l-warning" },
  frio: { label: "Frio", tone: "info", borda: "border-l-primary" },
};

function CardItem({ card, etapas }: { card: CardComRelacoes; etapas: CrmEtapa[] }) {
  const [isPending, startTransition] = useTransition();
  const [mostrarMotivoPerda, setMostrarMotivoPerda] = useState(false);
  const [motivoPerda, setMotivoPerda] = useState("");
  const temperatura = TEMPERATURA_CONFIG[card.cliente.temperatura] ?? TEMPERATURA_CONFIG.frio;

  function handleMarcarPerdido() {
    if (!motivoPerda.trim()) return;
    startTransition(() => { void marcarCardPerdidoAction(card.id, motivoPerda.trim()); });
    setMostrarMotivoPerda(false);
  }

  function handleReabrir() {
    startTransition(() => { void reabrirCardAction(card.id); });
  }

  return (
    <div
      className={cn(
        "flex animate-fade-in flex-col gap-2 rounded-md border border-l-4 border-border bg-card p-3 shadow-card transition-shadow hover:shadow-card-hover",
        temperatura.borda,
        card.status_recuperacao === "sem_retorno" && "opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
            {getInitials(card.cliente.nome)}
          </div>
          <Link href={`/clientes/${card.cliente.id}`} className="truncate text-sm font-medium text-foreground hover:underline">
            {card.cliente.nome}
          </Link>
        </div>

        <div className="flex items-center gap-1">
          {card.score > 0 && (
            <span
              className="neotec-dado flex items-center gap-0.5 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-foreground"
              title={`Lead score: ${card.score} pontos`}
            >
              <Flame className="h-3 w-3 text-danger" />{card.score}
            </span>
          )}

          {/* Só aparece quando já existe conversa vinculada a este card —
              card criado manualmente, sem contato pelo WhatsApp ainda,
              não tem pra onde ir. */}
          {card.conversa && (
            <Link
              href={`/comunicacao/${card.conversa.id}`}
              className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-primary"
              title="Abrir conversa"
            >
              <MessageCircle className="h-4 w-4" />
              {card.conversa.naoLidas > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground">
                  {card.conversa.naoLidas}
                </span>
              )}
            </Link>
          )}
        </div>
      </div>

      <span className="neotec-id-tag w-fit">{formatWhatsapp(card.cliente.whatsapp)}</span>

      <p className="line-clamp-2 text-xs text-muted-foreground">{card.titulo}</p>

      {card.resumo_ia && (
        <p className="flex items-start gap-1 rounded-md bg-primary/5 p-1.5 text-[11px] text-foreground">
          <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
          {card.resumo_ia}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <StatusBadge label={temperatura.label} tone={temperatura.tone} />
        {card.origem && <Badge variant="secondary" className="text-[10px]">{ORIGEM_LABEL[card.origem] ?? card.origem}</Badge>}
        {card.objecao && (
          <Badge variant="secondary" className="gap-1 text-[10px] text-warning">
            <AlertTriangle className="h-3 w-3" />{card.objecao === "preco" ? "Objeção: preço" : `Objeção: ${card.objecao}`}
          </Badge>
        )}
        {card.status_recuperacao === "sem_retorno" && <Badge variant="secondary" className="text-[10px]">Sem retorno</Badge>}
        {card.status_recuperacao === "recuperado" && <Badge variant="secondary" className="text-[10px] text-success">Recuperado pela IA</Badge>}
        {card.tags.map((tag) => (
          <Badge key={tag.id} variant="secondary" style={{ color: tag.cor }}>{tag.nome}</Badge>
        ))}
      </div>

      {card.proxima_acao && (
        <p className="text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground">Próxima ação:</span> {card.proxima_acao}
        </p>
      )}

      <div className="flex items-center justify-between">
        {card.valor_estimado != null && <span className="neotec-dado text-xs font-medium text-foreground">{formatCurrency(card.valor_estimado)}</span>}
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="h-3 w-3" />{formatDateTime(card.updated_at)}
        </span>
      </div>

      {card.perdido ? (
        <div className="flex items-center justify-between gap-2 rounded-md bg-secondary p-2">
          <span className="text-[11px] text-muted-foreground">Perdido: {card.motivo_perda}</span>
          <Button type="button" variant="ghost" size="sm" onClick={handleReabrir} disabled={isPending}>
            <RotateCcw className="h-3 w-3" />Reabrir
          </Button>
        </div>
      ) : mostrarMotivoPerda ? (
        <div className="flex items-center gap-1">
          <Input
            value={motivoPerda}
            onChange={(e) => setMotivoPerda(e.target.value)}
            placeholder="Motivo (ex: preço, comprou em outro lugar)"
            className="h-7 text-xs"
          />
          <Button type="button" size="sm" onClick={handleMarcarPerdido} disabled={isPending || !motivoPerda.trim()}>OK</Button>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMostrarMotivoPerda(false)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setMostrarMotivoPerda(true)}
          className="w-fit text-left text-[11px] text-muted-foreground hover:text-danger"
        >
          Marcar como perdido
        </button>
      )}

      <Select
        defaultValue={card.etapa_id}
        disabled={isPending}
        onValueChange={(etapaId) => startTransition(() => { void moverCardEtapaAction(card.id, etapaId); })}
      >
        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {etapas.map((etapa) => <SelectItem key={etapa.id} value={etapa.id}>{etapa.nome}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

export function PipelineKanban({ etapas, cards }: { etapas: CrmEtapa[]; cards: CardComRelacoes[] }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {etapas.map((etapa) => {
        const itens = cards.filter((c) => c.etapa_id === etapa.id);
        return (
          <div key={etapa.id} className="flex w-64 shrink-0 flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: etapa.cor }} />
                {etapa.nome}
              </h3>
              <span className="text-xs text-muted-foreground">{itens.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {itens.map((card) => <CardItem key={card.id} card={card} etapas={etapas} />)}
              {itens.length === 0 && (
                <div className="rounded-md border border-dashed border-border py-6 text-center text-xs text-muted-foreground">Vazio</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
