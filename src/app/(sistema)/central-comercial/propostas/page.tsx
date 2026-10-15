import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { exigirCargo } from "@/lib/auth/exigir-cargo";
import { listarPropostas } from "@/services/central-comercial/propostas.service";
import { emNegociacao, ROTULO_ESTADO } from "@/services/central-comercial/propostas-estado";
import { tentar } from "@/services/central-comercial/central-comercial.service";
import { PropostaAcoes } from "@/components/central-comercial/proposta-acoes";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDateTime } from "@/utils/format";
import { formatarTelefone } from "@/lib/telefone";

export const metadata = { title: "Propostas" };
export const dynamic = "force-dynamic";

export default async function PropostasPage({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  const auth = await exigirCargo(["admin", "gerente", "vendedor"]);
  if (!auth.permitido) return null;
  const { ver } = await searchParams;
  const todas = ver === "todas";
  const r = await tentar(() => listarPropostas({ usuarioId: auth.userId, cargo: auth.cargo }));

  const propostas = r.ok ? (todas ? r.dados.propostas : r.dados.propostas.filter((p) => emNegociacao(p.estado))) : [];
  return (
    <div className="space-y-6">
      <PageHeader
        title="Propostas"
        description={auth.cargo === "vendedor" ? "As suas propostas, com a última ação registrada em cada uma." : "Propostas da equipe, com a última ação registrada em cada uma."}
        actions={<Link href="/central-comercial/proposta" className={buttonVariants()}>Nova proposta</Link>}
      />
      <div className="flex gap-1 rounded-lg bg-secondary p-1 text-sm sm:w-fit" role="tablist" aria-label="Filtro de propostas">
        {[["Em andamento", "/central-comercial/propostas", !todas], ["Todas", "/central-comercial/propostas?ver=todas", todas]].map(([rotulo, href, ativo]) => (
          <Link key={String(href)} href={String(href)} role="tab" aria-selected={Boolean(ativo)} className={cn("flex-1 rounded-md px-4 py-2 text-center font-medium transition-colors sm:flex-none", ativo ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground")}>{String(rotulo)}</Link>
        ))}
      </div>

      {!r.ok ? <Card className="p-4 text-sm text-muted-foreground">Não foi possível carregar as propostas agora ({r.motivo}).</Card> : (
        <>
          {!r.dados.historicoDisponivel && <p role="status" className="rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning-text">O histórico detalhado (copiou, enviou, cliente respondeu) só funciona depois que a migration fase268 for aplicada. Por enquanto aparece só a situação básica.</p>}
          {propostas.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">{todas ? "Nenhuma proposta ainda." : "Nenhuma proposta em andamento."} <Link href="/central-comercial/proposta" className="font-medium text-primary hover:underline">Fazer uma proposta</Link></Card>
          ) : (
            <ul className="space-y-3">
              {propostas.map((p) => {
                const est = ROTULO_ESTADO[p.estado];
                return (
                  <li key={p.id}>
                    <Card className="space-y-3 p-4">
                      <div className="flex flex-wrap items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{p.clienteNome}</p>
                          <p className="text-xs text-muted-foreground">{p.clienteWhatsapp ? `${formatarTelefone(p.clienteWhatsapp)} · ` : ""}{p.itens} {p.itens === 1 ? "item" : "itens"}{p.modo ? ` · ${p.modo === "whatsapp" ? "WhatsApp" : "Na loja"}` : ""}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-display text-lg font-semibold tabular-nums">{formatCurrency(p.valor)}</p>
                          <StatusBadge label={est.rotulo} tone={est.tom} />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {p.ultimaAcao ? `Última ação: ${p.ultimaAcao.texto} · ${formatDateTime(p.ultimaAcao.em)}` : `Criada em ${formatDateTime(p.criadaEm)}`}
                        {p.validade ? ` · válida até ${new Date(`${p.validade}T12:00:00`).toLocaleDateString("pt-BR")}` : ""}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {p.estado !== "convertida" && <Link href={`/central-comercial/proposta?retomar=${p.id}`} className={buttonVariants({ size: "sm" })}>Retomar</Link>}
                        {p.conversaId && <Link href={`/comunicacao/${p.conversaId}`} className={buttonVariants({ variant: "outline", size: "sm" })}>Abrir conversa</Link>}
                        {p.estado === "aceita" && <Link href="/vendas" className={buttonVariants({ variant: "outline", size: "sm" })}>Fechar em Vendas</Link>}
                      </div>
                      <PropostaAcoes orcamentoId={p.id} estado={p.estado} />
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
