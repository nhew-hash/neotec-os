"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserPlus, ShoppingBag, Wrench, ShieldCheck, Gift, PanelRightOpen, PanelRightClose, CalendarClock, FileText, ArrowUpRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateTime } from "@/utils";
import { formatarTelefone } from "@/lib/telefone";
import { diasNaEtapa } from "@/services/dashboard/painel-regras";
import { AcoesRapidas } from "./acoes-rapidas";
import { cn } from "@/lib/utils";
import type { ResumoClienteAtendimento } from "@/services/comunicacao/comunicacao-cliente-resumo.service";

const CHAVE = "neotec-painel-cliente-aberto";
const STATUS_PROPOSTA: Record<string, string> = { criado: "Criada", enviado: "Enviada", visualizado: "Visualizada" };

/**
 * Painel do cliente ao lado da conversa. Continua FECHADO por padrão
 * (pedido explícito anterior: não roubar espaço da conversa), mas agora
 * lembra a escolha da pessoa neste navegador.
 *
 * Mostra o que o atendente precisa para dar continuidade sem abrir outras
 * telas: quem é, a oportunidade (etapa, próxima ação, há quanto tempo),
 * follow-ups pendentes, propostas em aberto e o histórico resumido.
 */
export function ClienteInfoPanel({ resumo, conversaId }: { resumo: ResumoClienteAtendimento; conversaId: string }) {
  const [aberto, setAberto] = useState(false);
  useEffect(() => {
    try { setAberto(localStorage.getItem(CHAVE) === "1"); } catch { /* sem armazenamento: fica fechado */ }
  }, []);
  function alternar(v: boolean) {
    setAberto(v);
    try { localStorage.setItem(CHAVE, v ? "1" : "0"); } catch { /* ignora */ }
  }

  if (!aberto) {
    return (
      <div className="hidden w-12 shrink-0 flex-col items-center border-l border-border bg-card py-3 lg:flex">
        <Button variant="ghost" size="icon" onClick={() => alternar(true)} title="Ver informações do cliente" aria-label="Ver informações do cliente">
          <PanelRightOpen className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
    );
  }

  return (
    <aside className="hidden w-80 shrink-0 flex-col overflow-y-auto border-l border-border bg-card lg:flex" aria-label="Informações do cliente">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <span className="text-[13px] font-semibold text-foreground">Cliente</span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => alternar(false)} title="Fechar" aria-label="Fechar painel do cliente">
          <PanelRightClose className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>

      <ClienteInfoConteudo resumo={resumo} conversaId={conversaId} />
    </aside>
  );
}

/** Conteúdo do painel do cliente — no computador fica ao lado da conversa; no celular abre por cima. */
export function ClienteInfoConteudo({ resumo, conversaId }: { resumo: ResumoClienteAtendimento; conversaId: string }) {
  return (
    <>
      {!resumo.cliente ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <UserPlus className="h-6 w-6 text-muted-foreground" aria-hidden />
          <p className="text-xs text-muted-foreground">Esta conversa ainda não está vinculada a um cadastro. O vínculo é feito automaticamente pelo telefone quando a mensagem chega.</p>
          <Button asChild variant="outline" size="sm"><Link href="/clientes/novo">Cadastrar cliente</Link></Button>
        </div>
      ) : (
        <div className="flex flex-col gap-5 p-4">
          <div>
            <Link href={`/clientes/${resumo.cliente.id}`} className="group inline-flex items-center gap-1 text-[15px] font-semibold text-foreground hover:underline">
              {resumo.cliente.nome}<ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            </Link>
            <p className="text-xs tabular-nums text-muted-foreground">{formatarTelefone(resumo.cliente.whatsapp)}{resumo.cliente.cidade ? ` · ${resumo.cliente.cidade}` : ""}</p>
            {resumo.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {resumo.tags.map((tag) => (
                  <span key={tag} className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", tag === "VIP" ? "bg-foreground text-background" : "bg-secondary text-muted-foreground")}>{tag}</span>
                ))}
              </div>
            )}
          </div>

          {resumo.oportunidade && resumo.etapaFunil ? (
            <Bloco titulo="Oportunidade" acao={<Link href="/crm" className="text-xs font-medium text-primary hover:underline">Abrir no CRM</Link>}>
              <div className="rounded-xl border border-border p-3">
                <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: resumo.etapaFunil.cor }} aria-hidden />
                  {resumo.etapaFunil.nome}
                  <span className="font-normal text-muted-foreground">· há {diasNaEtapa(resumo.oportunidade.entrouEtapaEm, new Date())} dia(s)</span>
                </div>
                <p className="mt-1 text-sm text-foreground">{resumo.oportunidade.titulo}</p>
                {resumo.etapaFunil.valorEstimado != null && <p className="text-xs tabular-nums text-muted-foreground">{formatCurrency(resumo.etapaFunil.valorEstimado)} estimado</p>}
                {resumo.oportunidade.objecao && (
                  <p className="mt-2 flex items-center gap-1 text-xs text-warning-text"><AlertTriangle className="h-3 w-3" aria-hidden />Objeção: {resumo.oportunidade.objecao === "preco" ? "preço" : resumo.oportunidade.objecao}</p>
                )}
                <p className="mt-2 text-xs">
                  <span className="font-medium text-foreground">Próxima ação: </span>
                  <span className={resumo.oportunidade.proximaAcao ? "text-foreground" : "text-muted-foreground"}>{resumo.oportunidade.proximaAcao ?? "não definida"}</span>
                </p>
              </div>
            </Bloco>
          ) : (
            <Bloco titulo="Oportunidade">
              <p className="text-xs text-muted-foreground">Nenhuma oportunidade em aberto no CRM para esta conversa.</p>
            </Bloco>
          )}

          <Bloco titulo="Follow-ups pendentes">
            {resumo.followupsPendentes === null ? (
              <p className="text-xs text-muted-foreground">Não foi possível carregar os follow-ups agora.</p>
            ) : resumo.followupsPendentes.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {resumo.followupsPendentes.map((f) => {
                  const atrasado = new Date(f.dataAgendada).getTime() < Date.now();
                  return (
                    <li key={f.id} className="flex gap-2 text-xs">
                      <CalendarClock className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", atrasado ? "text-danger" : "text-muted-foreground")} aria-hidden />
                      <span className="min-w-0">
                        <span className="block text-foreground">{f.motivo}</span>
                        <span className={cn("tabular-nums", atrasado ? "font-medium text-danger" : "text-muted-foreground")}>{atrasado ? "Atrasado · " : ""}{formatDateTime(f.dataAgendada)}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Bloco>

          <Bloco titulo="Propostas em aberto" acao={<Link href={`/central-comercial/proposta?conversa=${conversaId}`} className="text-xs font-medium text-primary hover:underline">Nova</Link>}>
            {resumo.propostasAbertas === null ? (
              <p className="text-xs text-muted-foreground">Não foi possível carregar as propostas agora.</p>
            ) : resumo.propostasAbertas.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma proposta em aberto.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {resumo.propostasAbertas.map((p) => (
                  <li key={p.id}>
                    <Link href={`/central-comercial/proposta?retomar=${p.id}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-secondary">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                      <span className="flex-1 tabular-nums text-foreground">{formatCurrency(p.valor)}</span>
                      <span className="text-muted-foreground">{STATUS_PROPOSTA[p.status] ?? p.status}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Bloco>

          <Bloco titulo="Ações">
            <AcoesRapidas clienteId={resumo.cliente.id} cardId={resumo.oportunidade?.id ?? null} sempreAberto />
          </Bloco>

          <Bloco titulo="Histórico">
            <dl className="grid grid-cols-2 gap-2">
              <Numero icon={ShoppingBag} label="Compras" valor={String(resumo.totalVendas)} />
              <Numero icon={Wrench} label="OS em aberto" valor={String(resumo.osAbertas)} />
              <Numero icon={ShieldCheck} label="Garantias ativas" valor={String(resumo.garantiasAtivas)} />
              <Numero icon={Gift} label="Cashback" valor={formatCurrency(resumo.saldoCashback)} />
            </dl>
          </Bloco>
        </div>
      )}
    </>
  );
}

function Bloco({ titulo, acao, children }: { titulo: string; acao?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{titulo}</h3>
        {acao}
      </div>
      {children}
    </section>
  );
}

function Numero({ icon: Icon, label, valor }: { icon: typeof Gift; label: string; valor: string }) {
  return (
    <div className="rounded-lg bg-secondary/70 p-2.5">
      <dt className="flex items-center gap-1 text-[11px] text-muted-foreground"><Icon className="h-3 w-3" aria-hidden />{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{valor}</dd>
    </div>
  );
}
