import {
  Wrench, ShoppingCart, PackagePlus, UserPlus, Search, CalendarClock,
  AlertTriangle, Truck, PackageX, ListTodo, Wallet, Cake,
  MessageCircle, MessagesSquare, Clock,
} from "lucide-react";
import { obterResumoOperacional } from "@/services/dashboard/dashboard.service";
import { ActionButton } from "@/components/dashboard/action-button";
import { IndicadorCard } from "@/components/dashboard/indicador-card";
import { formatCurrency } from "@/utils";

const ACOES = [
  { href: "/assistencia/nova", label: "Nova Ordem de Serviço", icon: Wrench, destaque: true },
  { href: "/vendas/orcamentos/novo", label: "Nova Venda", icon: ShoppingCart, destaque: true },
  { href: "/estoque/aparelhos/novo", label: "Entrada de Aparelho", icon: PackagePlus },
  { href: "/clientes/novo", label: "Novo Cliente", icon: UserPlus },
  { href: "/clientes", label: "Buscar Cliente", icon: Search },
  { href: "/crm/retornos", label: "Agenda de Retornos", icon: CalendarClock },
];

export default async function DashboardPage() {
  const resumo = await obterResumoOperacional();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">O que você quer fazer?</h1>
        <p className="text-sm text-muted-foreground">Central de Operações — Neotec Araguari</p>
      </div>

      {/* Grandes botões de ação — mobile first, alvo de toque generoso */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {ACOES.map((acao) => <ActionButton key={acao.href} {...acao} />)}
      </div>

      {/* Indicadores operacionais do dia */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <IndicadorCard
          label="OS em atraso"
          value={resumo.osAtrasadas}
          icon={AlertTriangle}
          href="/assistencia"
          tom={resumo.osAtrasadas > 0 ? "alerta" : "neutro"}
        />
        <IndicadorCard label="Entregas do dia" value={resumo.entregasHoje} icon={Truck} href="/assistencia" />
        <IndicadorCard
          label="Estoque baixo"
          value={resumo.estoqueBaixoQtd}
          icon={PackageX}
          href="/estoque"
          tom={resumo.estoqueBaixoQtd > 0 ? "alerta" : "neutro"}
        />
        <IndicadorCard label="Pendências" value={resumo.pendenciasQtd} icon={ListTodo} />
        <IndicadorCard
          label="Financeiro do dia"
          value={formatCurrency(resumo.financeiroSaldoHoje)}
          icon={Wallet}
          href="/financeiro"
          tom="sucesso"
        />
        <IndicadorCard label="Próximos aniversários" value={resumo.aniversariantes.length} icon={Cake} href="/clientes" />
      </div>

      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Comunicação</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <IndicadorCard label="Mensagens hoje" value={resumo.comunicacao.mensagensHoje} icon={MessageCircle} href="/comunicacao" />
          <IndicadorCard label="Conversas abertas" value={resumo.comunicacao.conversasAbertas} icon={MessagesSquare} href="/comunicacao" />
          <IndicadorCard
            label="Sem resposta"
            value={resumo.comunicacao.semResposta}
            icon={AlertTriangle}
            href="/comunicacao"
            tom={resumo.comunicacao.semResposta > 0 ? "alerta" : "neutro"}
          />
          <IndicadorCard label="Novos leads" value={resumo.comunicacao.novosLeads} icon={UserPlus} href="/comunicacao/pipeline" />
          <IndicadorCard label="Retornos" value={resumo.retornosHoje} icon={CalendarClock} href="/crm/retornos" />
          <IndicadorCard
            label="Tempo médio de resposta"
            value={resumo.comunicacao.tempoMedioRespostaMin != null ? `${resumo.comunicacao.tempoMedioRespostaMin} min` : "—"}
            icon={Clock}
          />
        </div>
      </div>

      {resumo.aniversariantes.length > 0 && (
        <div className="rounded-card border border-border bg-card p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Aniversariantes da semana
          </h2>
          <div className="flex flex-wrap gap-2">
            {resumo.aniversariantes.map((cliente) => (
              <span key={cliente.id} className="rounded-full bg-secondary px-3 py-1 text-sm text-foreground">
                🎂 {cliente.nome}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
