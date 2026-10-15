import Link from "next/link";
import { CalendarClock, FileText, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDateTime, formatHorarioCurto } from "@/utils";
import { diasNaEtapa } from "@/services/dashboard/painel-regras";
import { cn } from "@/lib/utils";
import type { ResumoClienteAtendimento } from "@/services/comunicacao/comunicacao-cliente-resumo.service";

export interface ConversaDoCliente { id: string; status: string; nao_lidas: number; ultima_mensagem_em: string | null }

const STATUS_CONVERSA: Record<string, string> = { aberta: "Em atendimento", aguardando_cliente: "Aguardando cliente", resolvida: "Resolvida", perdida: "Perdida" };

/**
 * "Onde está o atendimento deste cliente" no perfil: conversas reais do
 * WhatsApp (a aba antiga "Conversas" lê a tabela legada da Fase 1), a
 * oportunidade em aberto com a próxima ação, retornos e propostas.
 * Tudo vem das entidades oficiais (whatsapp_conversas, crm_cards,
 * crm_followups, orcamentos) — nenhuma cópia.
 */
export function AtendimentoClienteCard({ conversas, resumo }: { conversas: ConversaDoCliente[]; resumo: ResumoClienteAtendimento }) {
  const op = resumo.oportunidade;
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle>Atendimento</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm">
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">WhatsApp</span>
          {conversas.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma conversa registrada.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {conversas.map((c) => (
                <li key={c.id}>
                  <Link href={`/comunicacao/${c.id}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-secondary">
                    <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                    <span className="flex-1 text-xs text-foreground">{STATUS_CONVERSA[c.status] ?? c.status}</span>
                    {c.nao_lidas > 0 && <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">{c.nao_lidas}</span>}
                    {c.ultima_mensagem_em && <span className="text-[11px] tabular-nums text-muted-foreground">{formatHorarioCurto(c.ultima_mensagem_em)}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Oportunidade</span>
          {op && resumo.etapaFunil ? (
            <Link href="/crm" className="rounded-xl border border-border p-3 hover:bg-secondary/50">
              <span className="flex items-center gap-1.5 text-xs font-medium">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: resumo.etapaFunil.cor }} aria-hidden />
                {resumo.etapaFunil.nome}
                <span className="font-normal text-muted-foreground">· há {diasNaEtapa(op.entrouEtapaEm, new Date())} dia(s)</span>
              </span>
              <span className="mt-1 block text-sm">{op.titulo}</span>
              {resumo.etapaFunil.valorEstimado != null && <span className="block text-xs tabular-nums text-muted-foreground">{formatCurrency(resumo.etapaFunil.valorEstimado)} estimado</span>}
              <span className="mt-1.5 block text-xs"><span className="font-medium">Próxima ação: </span><span className={op.proximaAcao ? "" : "text-muted-foreground"}>{op.proximaAcao ?? "não definida"}</span></span>
            </Link>
          ) : (
            <p className="text-xs text-muted-foreground">Nenhuma oportunidade em aberto no CRM.</p>
          )}
        </div>

        {(resumo.followupsPendentes === null || resumo.propostasAbertas === null) && (
          <p className="text-xs text-muted-foreground">Parte do histórico comercial não pôde ser carregada agora.</p>
        )}

        {resumo.followupsPendentes && resumo.followupsPendentes.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Retornos pendentes</span>
            <ul className="flex flex-col gap-1.5">
              {resumo.followupsPendentes.map((f) => {
                const atrasado = new Date(f.dataAgendada).getTime() < Date.now();
                return (
                  <li key={f.id} className="flex gap-2 text-xs">
                    <CalendarClock className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", atrasado ? "text-danger" : "text-muted-foreground")} aria-hidden />
                    <span>{f.motivo} · <span className={cn("tabular-nums", atrasado ? "font-medium text-danger" : "text-muted-foreground")}>{formatDateTime(f.dataAgendada)}</span></span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {resumo.propostasAbertas && resumo.propostasAbertas.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Propostas em aberto</span>
            <ul className="flex flex-col gap-1">
              {resumo.propostasAbertas.map((p) => (
                <li key={p.id}>
                  <Link href={`/central-comercial/proposta?retomar=${p.id}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-secondary">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                    <span className="flex-1 tabular-nums">{formatCurrency(p.valor)}</span>
                    <span className="text-muted-foreground">{formatHorarioCurto(p.criadaEm)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
