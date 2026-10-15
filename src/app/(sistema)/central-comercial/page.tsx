import Link from "next/link";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { exigirCargo } from "@/lib/auth/exigir-cargo";
import { conversasAguardandoResposta, garantirTarefasDoDia, listarMinhasTarefas, orcamentosEmAberto, resultadoDoMes, tentar } from "@/services/central-comercial/central-comercial.service";
import { listarSugestoes } from "@/services/ia/sugestoes-comerciais.service";
import { listarMinhasAprovacoes } from "@/services/vendas/aprovacoes-desconto.service";
import { SugestoesLista } from "@/components/central-comercial/sugestoes-lista";
import { ChecklistLista } from "@/components/central-comercial/checklist-lista";
import { formatCurrency, formatDateTime } from "@/utils/format";
import { obterDataHoraBrasilia } from "@/utils/data-brasilia";
import { proximaAcao } from "@/services/central-comercial/rotina";
import { ArrowRight } from "lucide-react";

export const metadata = { title: "Minha rotina" };
export const dynamic = "force-dynamic";

function Indisponivel({ motivo }: { motivo: string }) {
  return <Card className="p-4 text-sm text-muted-foreground">Esta parte não pôde ser carregada agora ({motivo}).</Card>;
}
function Secao({ titulo, descricao, id, children }: { titulo: string; descricao?: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-16 space-y-2">
      <div><h2 className="font-display text-base font-semibold">{titulo}</h2>{descricao && <p className="text-xs text-muted-foreground">{descricao}</p>}</div>
      {children}
    </section>
  );
}

export default async function MinhaRotinaPage() {
  const auth = (await exigirCargo(["admin", "gerente", "vendedor"]));
  if (!auth.permitido) return null;
  const agora = new Date();

  await tentar(() => garantirTarefasDoDia(agora)); // idempotente
  const [tarefas, aguardando, orcamentos, sugestoes, meta, aprovacoes] = await Promise.all([
    tentar(() => listarMinhasTarefas(auth.userId, agora)),
    tentar(() => conversasAguardandoResposta(auth.userId, auth.cargo)),
    tentar(() => orcamentosEmAberto(auth.userId, auth.cargo, agora)),
    tentar(() => listarSugestoes({ responsavelId: auth.cargo === "vendedor" ? auth.userId : undefined, limite: 20 })),
    tentar(() => resultadoDoMes(auth.userId, agora)),
    tentar(() => listarMinhasAprovacoes(auth.userId)),
  ]);

  const hora = obterDataHoraBrasilia(agora).hora;
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";

  const acao = proximaAcao({
    clientesAguardando: aguardando.ok ? aguardando.dados.map((c) => ({ nome: c.cliente_nome ?? c.telefone, naoLidas: c.nao_lidas, conversaId: c.id })) : [],
    orcamentosParados: orcamentos.ok ? orcamentos.dados.map((o) => ({ cliente: o.cliente_nome, dias: o.dias_parado })) : [],
    sugestoesPendentes: sugestoes.ok ? sugestoes.dados.filter((x) => x.status === "sugerida").length : 0,
    tarefasAtrasadas: tarefas.ok ? tarefas.dados.filter((t) => t.status === "pendente" && new Date(t.prazo).getTime() < agora.getTime()).length : 0,
    tarefasPendentes: tarefas.ok ? tarefas.dados.filter((t) => t.status === "pendente").length : 0,
  });
  // Se alguma fonte falhou, não declaramos "tudo em dia": a tela precisa dizer que não sabe.
  const algumaFalhou = [aguardando, orcamentos, sugestoes, tarefas].some((f) => !f.ok);

  return (
    <div className="space-y-8">
      <section aria-labelledby="agora" className="rounded-xl bg-accent p-5 md:p-6">
        <p className="text-sm text-accent-foreground/80">{saudacao}. O que precisa de você agora:</p>
        {algumaFalhou && acao.tipo === "em_dia" ? (
          <div className="mt-2">
            <h1 id="agora" className="font-display text-2xl font-semibold tracking-tight">Não consegui conferir tudo</h1>
            <p className="mt-1 text-sm text-muted-foreground">Algumas partes abaixo não carregaram. Atualize a página antes de considerar o dia em ordem.</p>
          </div>
        ) : (
          <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 id="agora" className="font-display text-2xl font-semibold tracking-tight md:text-3xl">{acao.titulo}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{acao.detalhe}</p>
            </div>
            <div className="flex gap-2">
              <Link href={acao.href} className={buttonVariants({ size: "lg" })}>{acao.rotulo}<ArrowRight className="ml-2 h-4 w-4" aria-hidden /></Link>
              {acao.tipo !== "em_dia" && <Link href="/vendas/pdv" className={buttonVariants({ variant: "outline", size: "lg" })}>PDV</Link>}
            </div>
          </div>
        )}
        <div className="mt-5 border-t border-accent-foreground/10 pt-4">
          {!meta.ok ? <p className="text-sm text-muted-foreground">Meta indisponível agora ({meta.motivo}).</p> : meta.dados.meta === null ? (
            <p className="text-sm text-muted-foreground">Vendido no mês: <strong className="tabular-nums text-foreground">{formatCurrency(meta.dados.realizado)}</strong> ({meta.dados.vendas} {meta.dados.vendas === 1 ? "venda" : "vendas"}). Sem meta definida; a gerência define em Gerência.</p>
          ) : (
            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span><strong className="text-lg tabular-nums">{formatCurrency(meta.dados.realizado)}</strong> <span className="text-muted-foreground">de {formatCurrency(meta.dados.meta)} ({meta.dados.percentual}%)</span></span>
                <span className="text-muted-foreground">{meta.dados.faltam ? `Faltam ${formatCurrency(meta.dados.faltam)}` : "Meta batida"}{meta.dados.porDiaRestante ? ` · ${formatCurrency(meta.dados.porDiaRestante)} por dia` : ""}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-background" role="progressbar" aria-valuenow={Math.min(meta.dados.percentual ?? 0, 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso da meta do mês">
                <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${Math.min(meta.dados.percentual ?? 0, 100)}%` }} />
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
        <Secao titulo="Clientes que precisam de resposta" descricao="Conversas com mensagem não lida, as mais recentes primeiro.">
          {!aguardando.ok ? <Indisponivel motivo={aguardando.motivo} /> : aguardando.dados.length === 0 ? <Card className="p-4 text-sm text-muted-foreground">Ninguém esperando resposta.</Card> : (
            <Card className="px-4"><ul className="divide-y divide-border">
              {aguardando.dados.slice(0, 8).map((c) => (
                <li key={c.id} className="flex items-center gap-3 py-3 text-sm">
                  <div className="min-w-0 flex-1"><p className="truncate font-medium">{c.cliente_nome ?? c.telefone}</p>
                    <p className="text-xs text-muted-foreground">{c.nao_lidas} {c.nao_lidas === 1 ? "mensagem" : "mensagens"}{c.ultima_mensagem_em ? ` · ${formatDateTime(c.ultima_mensagem_em)}` : ""}</p></div>
                  <Link href={`/comunicacao/${c.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>Responder</Link>
                </li>
              ))}
              {aguardando.dados.length > 8 && (
                <li className="py-3 text-sm"><Link href="/comunicacao" className="font-medium text-primary hover:underline">Ver todas as {aguardando.dados.length} conversas na Comunicação</Link></li>
              )}
            </ul></Card>
          )}
        </Secao>

        <Secao titulo="Propostas aguardando retorno" descricao="Em aberto, com o tempo desde a criação.">
          {!orcamentos.ok ? <Indisponivel motivo={orcamentos.motivo} /> : orcamentos.dados.length === 0 ? <Card className="p-4 text-sm text-muted-foreground">Nenhuma proposta em aberto. <Link className="font-medium text-primary underline-offset-2 hover:underline" href="/central-comercial/proposta">Fazer uma proposta</Link></Card> : (
            <Card className="px-4"><ul className="divide-y divide-border">
              {orcamentos.dados.slice(0, 6).map((o) => (
                <li key={o.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                  <div className="min-w-0 flex-1"><p className="truncate font-medium">{o.cliente_nome ?? "Cliente"}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">{formatCurrency(o.valor)}</p></div>
                  {o.dias_parado >= 3 ? <StatusBadge label={`Parada há ${o.dias_parado} dias`} tone="warning" /> : <span className="text-xs text-muted-foreground">há {o.dias_parado} {o.dias_parado === 1 ? "dia" : "dias"}</span>}
                  <Link href={`/central-comercial/proposta?retomar=${o.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>Retomar</Link>
                </li>
              ))}
            </ul>
            {orcamentos.dados.length > 6 && <Link href="/central-comercial/propostas" className="block border-t border-border py-3 text-center text-sm font-medium text-primary">Ver todas as propostas</Link>}
            </Card>
          )}
        </Secao>
      </div>

      <Secao id="follow-ups" titulo="Follow-ups sugeridos" descricao="O sistema sugere; você edita, envia, adia ou descarta. Nada é enviado sozinho.">
        {!sugestoes.ok ? <Indisponivel motivo={sugestoes.motivo} /> : <SugestoesLista sugestoes={sugestoes.dados} />}
      </Secao>

      <Secao id="tarefas" titulo="Tarefas de hoje">
        {!tarefas.ok ? <Indisponivel motivo={tarefas.motivo} /> : <ChecklistLista tarefas={tarefas.dados} />}
      </Secao>

      {aprovacoes.ok && aprovacoes.dados.length > 0 && (
        <Secao titulo="Meus pedidos de desconto">
          <Card className="px-4"><ul className="divide-y divide-border">
            {aprovacoes.dados.slice(0, 8).map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <span className="tabular-nums">{formatCurrency(a.valor_desconto)} ({a.percentual}%)</span>
                <StatusBadge label={{ pendente: "Aguardando gerente", aprovada: "Aprovado", recusada: "Recusado", usada: "Já usado", expirada: "Vencido" }[a.status]} tone={a.status === "aprovada" ? "success" : a.status === "recusada" ? "danger" : a.status === "pendente" ? "warning" : "neutral"} />
                {a.decisao_motivo && <span className="text-xs text-muted-foreground">{a.decisao_motivo}</span>}
              </li>
            ))}
          </ul></Card>
        </Secao>
      )}
    </div>
  );
}
