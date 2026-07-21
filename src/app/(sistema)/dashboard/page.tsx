import {
  Wrench, ShoppingCart, PackagePlus, UserPlus, Search, CalendarClock,
  AlertTriangle, Truck, PackageX, ListTodo, Wallet, Cake,
  MessageCircle, MessagesSquare, Clock, TrendingUp, UserCheck, ClipboardList, Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { obterResumoOperacional } from "@/services/dashboard/dashboard.service";
import { buscarIntegracaoWhatsapp } from "@/services/integracoes/integracoes-whatsapp.service";
import {
  obterVendasPorPeriodo, obterOrigemClientes, obterFunilCRM, obterDesempenhoEquipe,
} from "@/services/dashboard/dashboard-graficos.service";
import { listarFollowupsPendentes } from "@/services/crm-pipeline/crm-pipeline.service";
import { listarRetornosPendentes } from "@/services/crm/crm.service";
import { categorizarFollowups } from "@/utils/followups";
import { ActionButton } from "@/components/dashboard/action-button";
import { IndicadorCard } from "@/components/dashboard/indicador-card";
import { HeroStatCard } from "@/components/dashboard/hero-stat-card";
import { WhatsappStatusCard } from "@/components/dashboard/whatsapp-status-card";
import { GraficosDashboard } from "@/components/dashboard/graficos-dashboard";
import { contarConversasNaoLidas } from "@/services/whatsapp/whatsapp.service";
import { formatCurrency } from "@/utils";
import type { CargoUsuario } from "@/types";

const ACOES = [
  { href: "/assistencia/nova", label: "Nova Ordem de Serviço", icon: Wrench, destaque: true, cargos: ["admin", "gerente", "tecnico"] as CargoUsuario[] },
  { href: "/vendas/pdv", label: "Nova Venda", icon: ShoppingCart, destaque: true, cargos: ["admin", "gerente", "vendedor"] as CargoUsuario[] },
  { href: "/estoque/aparelhos/novo", label: "Entrada de Aparelho", icon: PackagePlus, cargos: ["admin", "gerente", "tecnico"] as CargoUsuario[] },
  { href: "/clientes/novo", label: "Novo Cliente", icon: UserPlus, cargos: ["admin", "gerente", "vendedor", "tecnico", "caixa"] as CargoUsuario[] },
  { href: "/clientes", label: "Buscar Cliente", icon: Search, cargos: ["admin", "gerente", "vendedor", "tecnico", "caixa"] as CargoUsuario[] },
  { href: "/crm/retornos", label: "Agenda de Retornos", icon: CalendarClock, cargos: ["admin", "gerente", "vendedor"] as CargoUsuario[] },
];

export default async function DashboardPage() {
  const resumo = await obterResumoOperacional();
  const integracaoWhatsapp = await buscarIntegracaoWhatsapp();
  const supabase = await createClient();

  const [vendasPorPeriodo, origemClientes, funilCRM, desempenhoEquipe, followups, retornos, naoLidas, configIA] = await Promise.all([
    obterVendasPorPeriodo(), obterOrigemClientes(), obterFunilCRM(), obterDesempenhoEquipe(),
    listarFollowupsPendentes(), listarRetornosPendentes(), contarConversasNaoLidas(),
    supabase.from("configuracoes_ia").select("ativo, atendimento_automatico_ativo").maybeSingle().then((r) => r.data),
  ]);
  const followupsAtrasados = categorizarFollowups(followups, retornos).filter((i) => i.categoria === "atrasado").length;
  const totalLeads = funilCRM.reduce((acc, e) => acc + e.quantidade, 0);

  const { data: { user } } = await supabase.auth.getUser();
  const { data: perfil } = await supabase
    .from("usuarios").select("cargo").eq("id", user?.id ?? "").single<{ cargo: CargoUsuario }>();
  const cargo = perfil?.cargo ?? "vendedor";
  const acoesVisiveis = ACOES.filter((acao) => acao.cargos.includes(cargo));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">O que você quer fazer?</h1>
        <p className="text-sm text-muted-foreground">Central de Operações — Neotec Araguari</p>
      </div>

      {/* Cards grandes — visão executiva do dia, tratamento visual diferente do resto do dashboard de propósito */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <HeroStatCard label="Faturamento" value={formatCurrency(resumo.faturamentoHoje)} icon={Wallet} href="/vendas" destaque="success" />
        <HeroStatCard label="Vendas hoje" value={resumo.vendasHoje} icon={TrendingUp} href="/vendas" destaque="success" />
        <HeroStatCard label="Leads" value={totalLeads} icon={UserCheck} href="/crm" />
        <HeroStatCard label="Assistência" value={resumo.osEmAndamento} icon={Wrench} href="/assistencia" />
        <HeroStatCard label="WhatsApp" value={naoLidas} icon={MessageCircle} href="/comunicacao" destaque={naoLidas > 0 ? "warning" : "primary"} />
        <HeroStatCard label="IA" value={configIA?.ativo ? "Ativa" : "Desligada"} icon={Sparkles} href="/configuracoes/ia" destaque={configIA?.ativo ? "success" : "primary"} />
      </div>

      {/* Grandes botões de ação — mobile first, alvo de toque generoso, filtrados por cargo */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {acoesVisiveis.map((acao) => (
          <ActionButton key={acao.href} href={acao.href} label={acao.label} icon={acao.icon} destaque={acao.destaque} />
        ))}
      </div>

      {/* Indicadores operacionais do dia */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <IndicadorCard label="Vendas hoje" value={resumo.vendasHoje} icon={TrendingUp} href="/vendas" tom="sucesso" />
        <IndicadorCard label="Faturamento hoje" value={formatCurrency(resumo.faturamentoHoje)} icon={Wallet} href="/vendas" tom="sucesso" />
        <IndicadorCard label="Novos clientes hoje" value={resumo.clientesNovosHoje} icon={UserCheck} href="/clientes" />
        <IndicadorCard label="OS em andamento" value={resumo.osEmAndamento} icon={ClipboardList} href="/assistencia" />
        <IndicadorCard
          label="Follow-ups atrasados"
          value={followupsAtrasados}
          icon={AlertTriangle}
          href="/crm"
          tom={followupsAtrasados > 0 ? "alerta" : "neutro"}
        />
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
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Visão geral</h2>
        <GraficosDashboard
          vendasPorPeriodo={vendasPorPeriodo}
          origemClientes={origemClientes}
          funilCRM={funilCRM}
          desempenhoEquipe={desempenhoEquipe}
        />
      </div>

      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Comunicação</h2>
        <WhatsappStatusCard integracao={integracaoWhatsapp} />
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <IndicadorCard label="Mensagens hoje" value={resumo.comunicacao.mensagensHoje} icon={MessageCircle} href="/comunicacao" />
          <IndicadorCard label="Conversas abertas" value={resumo.comunicacao.conversasAbertas} icon={MessagesSquare} href="/comunicacao" />
          <IndicadorCard
            label="Sem resposta"
            value={resumo.comunicacao.semResposta}
            icon={AlertTriangle}
            href="/comunicacao"
            tom={resumo.comunicacao.semResposta > 0 ? "alerta" : "neutro"}
          />
          <IndicadorCard label="Novos leads" value={resumo.comunicacao.novosLeads} icon={UserPlus} href="/crm" />
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
