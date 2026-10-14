import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { exigirCargo } from "@/lib/auth/exigir-cargo";
import { createClient } from "@/lib/supabase/server";
import { historicoDeAlteracoes, lucroDoMes, listarModelosChecklist, orcamentosEmAberto, pendenciasPorResponsavel, resultadoDoMes, resumoChecklistDaEquipe, tentar, tradeInsPendentes } from "@/services/central-comercial/central-comercial.service";
import { listarAprovacoesPendentes } from "@/services/vendas/aprovacoes-desconto.service";
import { obterConfigBot } from "@/services/ia/sugestoes-comerciais.service";
import { AprovacoesGerente } from "@/components/central-comercial/aprovacoes-gerente";
import { ConfigBotForm, MetaForm, ModelosLista, NovaTarefaForm } from "@/components/central-comercial/gerencia-config";
import { formatCurrency, formatDateTime } from "@/utils/format";

export const metadata = { title: "Gerência comercial" };
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

export default async function GerenciaComercialPage() {
  const auth = await exigirCargo(["admin", "gerente"]);
  if (!auth.permitido) redirect("/central-comercial");
  const agora = new Date();
  const supabase = await createClient();

  const [aprovacoes, tradeIns, parados, equipeCk, pendencias, metaLoja, historico, modelos, bot, lucro, vendedores] = await Promise.all([
    tentar(() => listarAprovacoesPendentes()),
    tentar(() => tradeInsPendentes()),
    tentar(() => orcamentosEmAberto(auth.userId, "gerente", agora)),
    tentar(() => resumoChecklistDaEquipe(agora)),
    tentar(() => pendenciasPorResponsavel()),
    tentar(() => resultadoDoMes(null, agora)),
    tentar(() => historicoDeAlteracoes(30)),
    tentar(() => listarModelosChecklist()),
    tentar(() => obterConfigBot()),
    tentar(() => lucroDoMes(agora)),
    tentar(async () => {
      const { data, error } = await supabase.from("usuarios").select("id, nome").eq("cargo", "vendedor").eq("status", "ativo").order("nome");
      if (error) throw new Error(error.message);
      return data ?? [];
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Gerência comercial" description="Aprovações, pendências da equipe, metas e checklists." actions={<Link href="/central-comercial" className={buttonVariants({ variant: "outline" })}>Minha rotina</Link>} />

      <Secao titulo="Descontos aguardando aprovação">
        {!aprovacoes.ok ? <Indisponivel motivo={aprovacoes.motivo} /> : <AprovacoesGerente aprovacoes={aprovacoes.dados} />}
      </Secao>

      <Secao titulo="Avaliações de trade-in pendentes">
        {!tradeIns.ok ? <Indisponivel motivo={tradeIns.motivo} /> : tradeIns.dados.length === 0 ? <Card className="p-4 text-sm text-muted-foreground">Nenhuma avaliação pendente.</Card> : (
          <Card className="px-4"><ul className="divide-y divide-border">
            {tradeIns.dados.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                <span className="flex-1 font-medium">{t.modelo_nome}{t.cliente_nome ? ` — ${t.cliente_nome}` : ""}</span>
                <span className="tabular-nums">{formatCurrency(t.valor_calculado)}</span>
                <span className="text-xs text-muted-foreground">{formatDateTime(t.created_at)}</span>
                <Link href="/trade-in" className={buttonVariants({ variant: "outline", size: "sm" })}>Avaliar</Link>
              </li>
            ))}
          </ul></Card>
        )}
      </Secao>

      <Secao titulo="Orçamentos parados" descricao="Em aberto há 3 dias ou mais.">
        {!parados.ok ? <Indisponivel motivo={parados.motivo} /> : (() => {
          const lista = parados.dados.filter((o) => o.dias_parado >= 3);
          return lista.length === 0 ? <Card className="p-4 text-sm text-muted-foreground">Nenhum orçamento parado.</Card> : (
            <Card className="px-4"><ul className="divide-y divide-border">
              {lista.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                  <span className="flex-1 font-medium">{o.cliente_nome ?? "Cliente"}</span>
                  <span className="tabular-nums">{formatCurrency(o.valor)}</span>
                  <StatusBadge label={`${o.dias_parado} dias`} tone="warning" />
                </li>
              ))}
            </ul></Card>
          );
        })()}
      </Secao>

      <Secao titulo="Pendências da equipe">
        {!pendencias.ok ? <Indisponivel motivo={pendencias.motivo} /> : pendencias.dados.length === 0 ? <Card className="p-4 text-sm text-muted-foreground">Nenhuma conversa esperando resposta.</Card> : (
          <Card className="px-4"><ul className="divide-y divide-border">
            {pendencias.dados.map((p) => (
              <li key={p.responsavel_id ?? "sem"} className="flex items-center gap-3 py-2 text-sm">
                <span className="flex-1">{p.responsavel_nome}</span>
                <span className="tabular-nums">{p.quantidade} {p.quantidade === 1 ? "conversa" : "conversas"} sem resposta</span>
              </li>
            ))}
          </ul></Card>
        )}
      </Secao>

      <Secao titulo="Checklist da equipe hoje">
        {!equipeCk.ok ? <Indisponivel motivo={equipeCk.motivo} /> : equipeCk.dados.equipe.length === 0 ? <Card className="p-4 text-sm text-muted-foreground">Nenhuma tarefa gerada para hoje.</Card> : (
          <Card className="px-4"><ul className="divide-y divide-border">
            {equipeCk.dados.equipe.map((e) => (
              <li key={e.responsavel_id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                <span className="flex-1 font-medium">{e.nome}</span>
                <span className="tabular-nums">{e.concluidas}/{e.total} concluídas</span>
                {e.atrasadas > 0 && <StatusBadge label={`${e.atrasadas} atrasada${e.atrasadas > 1 ? "s" : ""}`} tone="danger" />}
              </li>
            ))}
          </ul></Card>
        )}
      </Secao>

      <Secao titulo="Metas do mês" descricao="Deixe em branco para remover o acompanhamento; a meta só vale para o mês atual.">
        {!metaLoja.ok ? <Indisponivel motivo={metaLoja.motivo} /> : (
          <Card className="space-y-3 p-4">
            <p className="text-sm">Loja: <strong className="tabular-nums">{formatCurrency(metaLoja.dados.realizado)}</strong> vendidos{metaLoja.dados.meta !== null ? ` de ${formatCurrency(metaLoja.dados.meta)} (${metaLoja.dados.percentual}%)` : " — sem meta definida"}</p>
            <MetaForm usuarioId={null} rotulo="Meta da loja" />
            {vendedores.ok && vendedores.dados.map((v) => <MetaForm key={v.id} usuarioId={v.id} rotulo={v.nome} />)}
          </Card>
        )}
      </Secao>

      <Secao titulo="Tarefas recorrentes">
        <NovaTarefaForm />
        {!modelos.ok ? <Indisponivel motivo={modelos.motivo} /> : <ModelosLista modelos={modelos.dados} />}
      </Secao>

      <Secao titulo="Bot e follow-up">
        {!bot.ok ? <Indisponivel motivo={bot.motivo} /> : <ConfigBotForm inicial={bot.dados} podeEditar={auth.cargo === "admin"} />}
      </Secao>

      {lucro.ok && (
        <Secao titulo="Resultado do mês" descricao="Visível só para administração e gerência.">
          <Card className="p-4"><p className="text-2xl font-semibold tabular-nums">{formatCurrency(lucro.dados)}</p><p className="text-xs text-muted-foreground">lucro das vendas concluídas no mês</p></Card>
        </Secao>
      )}

      <Secao titulo="Histórico de alterações">
        {!historico.ok ? <Indisponivel motivo={historico.motivo} /> : historico.dados.length === 0 ? <Card className="p-4 text-sm text-muted-foreground">Nenhuma alteração registrada.</Card> : (
          <Card className="px-4"><ul className="divide-y divide-border">
            {historico.dados.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                <span className="flex-1">{h.entidade} · {h.acao}</span>
                <span className="text-xs text-muted-foreground">{h.usuario_nome ?? "sistema"} · {formatDateTime(h.criado_em)}</span>
              </li>
            ))}
          </ul></Card>
        )}
      </Secao>
    </div>
  );
}
