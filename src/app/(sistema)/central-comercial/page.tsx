import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { exigirCargo } from "@/lib/auth/exigir-cargo";
import { conversasAguardandoResposta, garantirTarefasDoDia, listarMinhasTarefas, orcamentosEmAberto, resultadoDoMes, tentar } from "@/services/central-comercial/central-comercial.service";
import { listarSugestoes } from "@/services/ia/sugestoes-comerciais.service";
import { listarMinhasAprovacoes } from "@/services/vendas/aprovacoes-desconto.service";
import { SugestoesLista } from "@/components/central-comercial/sugestoes-lista";
import { ChecklistLista } from "@/components/central-comercial/checklist-lista";
import { formatCurrency, formatDateTime } from "@/utils/format";

export const metadata = { title: "Minha rotina" };
export const dynamic = "force-dynamic";

function Indisponivel({ motivo }: { motivo: string }) {
  return <Card className="p-4 text-sm text-muted-foreground">Esta parte não pôde ser carregada agora ({motivo}).</Card>;
}
function Secao({ titulo, descricao, children }: { titulo: string; descricao?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Minha rotina"
        description="O que precisa da sua atenção hoje, em ordem de importância."
        actions={<div className="flex gap-2">
          <Link href="/central-comercial/proposta" className={buttonVariants({ variant: "outline" })}>Fazer proposta</Link>
          <Link href="/vendas/pdv" className={buttonVariants()}>Abrir o PDV</Link>
        </div>}
      />

      <Secao titulo="Meta do mês">
        {!meta.ok ? <Indisponivel motivo={meta.motivo} /> : (
          <Card className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
            <div><p className="text-2xl font-semibold tabular-nums">{formatCurrency(meta.dados.realizado)}</p><p className="text-xs text-muted-foreground">vendido no mês ({meta.dados.vendas} {meta.dados.vendas === 1 ? "venda" : "vendas"})</p></div>
            {meta.dados.meta === null ? (
              <div className="col-span-1 sm:col-span-3"><p className="text-sm">Sem meta definida para você neste mês.</p><p className="text-xs text-muted-foreground">O gerente define a meta em Gerência.</p></div>
            ) : (<>
              <div><p className="text-2xl font-semibold tabular-nums">{meta.dados.percentual}%</p><p className="text-xs text-muted-foreground">de {formatCurrency(meta.dados.meta)}</p></div>
              <div><p className="text-2xl font-semibold tabular-nums">{formatCurrency(meta.dados.faltam ?? 0)}</p><p className="text-xs text-muted-foreground">faltam</p></div>
              <div><p className="text-2xl font-semibold tabular-nums">{meta.dados.porDiaRestante ? formatCurrency(meta.dados.porDiaRestante) : "—"}</p><p className="text-xs text-muted-foreground">por dia nos {meta.dados.diasRestantes} dias restantes</p></div>
            </>)}
          </Card>
        )}
      </Secao>

      <Secao titulo="Clientes que precisam de resposta" descricao="Conversas abertas com mensagem não lida, as mais antigas primeiro.">
        {!aguardando.ok ? <Indisponivel motivo={aguardando.motivo} /> : aguardando.dados.length === 0 ? <Card className="p-4 text-sm text-muted-foreground">Nenhum cliente esperando resposta.</Card> : (
          <Card className="px-4"><ul className="divide-y divide-border">
            {aguardando.dados.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="flex-1 font-medium">{c.cliente_nome ?? c.telefone}</span>
                <span className="text-xs text-muted-foreground">{c.nao_lidas} {c.nao_lidas === 1 ? "mensagem" : "mensagens"}{c.ultima_mensagem_em ? ` · ${formatDateTime(c.ultima_mensagem_em)}` : ""}</span>
                <Link href="/comunicacao" className={buttonVariants({ variant: "outline", size: "sm" })}>Abrir conversa</Link>
              </li>
            ))}
          </ul></Card>
        )}
      </Secao>

      <Secao titulo="Follow-ups sugeridos" descricao="O sistema sugere; você edita, envia, adia ou descarta. Nada é enviado sozinho.">
        {!sugestoes.ok ? <Indisponivel motivo={sugestoes.motivo} /> : <SugestoesLista sugestoes={sugestoes.dados} />}
      </Secao>

      <Secao titulo="Orçamentos em aberto">
        {!orcamentos.ok ? <Indisponivel motivo={orcamentos.motivo} /> : orcamentos.dados.length === 0 ? <Card className="p-4 text-sm text-muted-foreground">Nenhum orçamento em aberto.</Card> : (
          <Card className="px-4"><ul className="divide-y divide-border">
            {orcamentos.dados.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                <span className="flex-1 font-medium">{o.cliente_nome ?? "Cliente"}</span>
                <span className="tabular-nums">{formatCurrency(o.valor)}</span>
                {o.dias_parado >= 3 ? <StatusBadge label={`Parado há ${o.dias_parado} dias`} tone="warning" /> : <span className="text-xs text-muted-foreground">há {o.dias_parado} {o.dias_parado === 1 ? "dia" : "dias"}</span>}
                <Link href="/vendas" className={buttonVariants({ variant: "outline", size: "sm" })}>Ver em Vendas</Link>
              </li>
            ))}
          </ul></Card>
        )}
      </Secao>

      <Secao titulo="Tarefas de hoje">
        {!tarefas.ok ? <Indisponivel motivo={tarefas.motivo} /> : <ChecklistLista tarefas={tarefas.dados} />}
      </Secao>

      {aprovacoes.ok && aprovacoes.dados.length > 0 && (
        <Secao titulo="Meus pedidos de desconto">
          <Card className="px-4"><ul className="divide-y divide-border">
            {aprovacoes.dados.slice(0, 8).map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
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
