import Link from "next/link";
import {
  MessageCircle, CalendarClock, AlarmClock, Hourglass, FileText, Wrench,
  ShoppingCart, UserPlus, PackagePlus, Plus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { obterPainelDoDia } from "@/services/dashboard/painel.service";
import { buscarIntegracaoWhatsapp } from "@/services/integracoes/integracoes-whatsapp.service";
import {
  obterVendasPorPeriodo, obterOrigemClientes, obterFunilCRM, obterDesempenhoEquipe,
} from "@/services/dashboard/dashboard-graficos.service";
import { GraficosDashboard } from "@/components/dashboard/graficos-dashboard";
import { ItemAtencao, Kpi, Secao } from "@/components/dashboard/painel";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, getSaudacao } from "@/utils";
import { podeVerCusto } from "@/utils/permissions";
import { cn } from "@/lib/utils";
import type { CargoUsuario } from "@/types";

export const dynamic = "force-dynamic";

const ACOES: { href: string; label: string; icon: typeof Plus; cargos: CargoUsuario[] }[] = [
  { href: "/central-comercial/proposta", label: "Nova proposta", icon: FileText, cargos: ["admin", "gerente", "vendedor"] },
  { href: "/vendas/pdv", label: "Nova venda", icon: ShoppingCart, cargos: ["admin", "gerente", "vendedor"] },
  { href: "/assistencia/nova", label: "Nova OS", icon: Wrench, cargos: ["admin", "gerente", "tecnico"] },
  { href: "/clientes/novo", label: "Novo cliente", icon: UserPlus, cargos: ["admin", "gerente", "vendedor", "tecnico", "caixa"] },
  { href: "/estoque/aparelhos/novo", label: "Entrada de aparelho", icon: PackagePlus, cargos: ["admin", "gerente", "tecnico"] },
];

/**
 * Início — organizado pela decisão do dia, não por módulo:
 * 1) o que precisa de alguém agora (cada linha leva aos registros);
 * 2) os números de hoje (dia de Brasília);
 * 3) visão geral (gráficos) só para gestão.
 */
export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: perfil } = await supabase.from("usuarios").select("cargo, nome").eq("id", user?.id ?? "").single<{ cargo: CargoUsuario; nome: string }>();
  const cargo = perfil?.cargo ?? "vendedor";
  const gestao = podeVerCusto(cargo);
  const comercial = ["admin", "gerente", "vendedor"].includes(cargo);
  const veOS = ["admin", "gerente", "tecnico"].includes(cargo);

  const [painel, integracaoWhatsapp, graficos] = await Promise.all([
    obterPainelDoDia(cargo, user?.id ?? ""),
    gestao ? buscarIntegracaoWhatsapp().catch(() => null) : Promise.resolve(null),
    gestao
      ? Promise.all([obterVendasPorPeriodo(), obterOrigemClientes(), obterFunilCRM(), obterDesempenhoEquipe()]).catch(() => null)
      : Promise.resolve(null),
  ]);
  const { atencao, hoje } = painel;
  const acoes = ACOES.filter((a) => a.cargos.includes(cargo));
  const whatsappForaDoAr = integracaoWhatsapp && integracaoWhatsapp.status !== "conectado";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{getSaudacao()}, {perfil?.nome?.split(" ")[0] ?? ""}</p>
          <h1 className="font-display text-2xl font-semibold text-foreground md:text-[28px]">O que precisa de você hoje</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {acoes.map((a, i) => (
            <Link key={a.href} href={a.href} className={buttonVariants({ variant: i === 0 ? "default" : "outline", size: "sm" })}>
              <a.icon aria-hidden />{a.label}
            </Link>
          ))}
        </div>
      </header>

      {whatsappForaDoAr && (
        <Link href="/configuracoes/integracoes/whatsapp" className="flex items-center gap-3 rounded-card border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning-text">
          <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
          <span className="flex-1">O WhatsApp não está conectado — mensagens novas podem não chegar e envios vão falhar.</span>
          <StatusBadge label={integracaoWhatsapp.status} tone="warning" />
        </Link>
      )}

      <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr]">
        <Secao titulo="Precisa de você">
          <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-card shadow-card">
            {comercial && (
              <>
                <ItemAtencao label="Clientes aguardando resposta" descricao="A última mensagem da conversa é do cliente" vazio="Ninguém esperando resposta" indicador={atencao.conversasAguardando} href="/comunicacao?filtro=nao_lidas" icon={MessageCircle} tom="critico" />
                <ItemAtencao label="Follow-ups atrasados" descricao="Retornos que passaram da data" vazio="Nenhum retorno atrasado" indicador={atencao.followupsAtrasados} href="/crm?aba=followups" icon={AlarmClock} tom="critico" />
                <ItemAtencao label="Follow-ups para hoje" descricao="Retornos agendados para hoje" vazio="Nada agendado para hoje" indicador={atencao.followupsHoje} href="/crm?aba=followups" icon={CalendarClock} />
                <ItemAtencao
                  label="Oportunidades paradas"
                  descricao="Passaram do prazo de alerta da etapa"
                  vazio={atencao.oportunidadesParadas.ok && atencao.oportunidadesParadas.alertaConfigurado === false ? "Configure “dias para alerta” nas etapas do CRM" : "Nenhuma oportunidade parada"}
                  indicador={atencao.oportunidadesParadas}
                  href="/crm?filtro=paradas"
                  icon={Hourglass}
                />
                <ItemAtencao label="Propostas aguardando retorno" descricao="Criadas, enviadas ou visualizadas" vazio="Nenhuma proposta em aberto" indicador={atencao.propostasAbertas} href="/central-comercial/propostas" icon={FileText} tom="neutro" />
              </>
            )}
            {veOS && (
              <ItemAtencao label="OS com prazo vencido" descricao="Ainda não entregues" vazio="Nenhuma OS atrasada" indicador={atencao.osAtrasadas} href="/assistencia" icon={Wrench} tom="critico" />
            )}
          </ul>
        </Secao>

        <Secao titulo="Hoje">
          <div className="grid grid-cols-2 gap-3">
            {cargo !== "tecnico" && <Kpi label="Vendas concluídas" indicador={hoje.vendas} href="/vendas" />}
            {cargo !== "tecnico" && <Kpi label="Faturamento" indicador={hoje.faturamento} formatar={formatCurrency} href="/vendas" />}
            {comercial && <Kpi label="Novos contatos no WhatsApp" indicador={hoje.novosContatos} href="/comunicacao" />}
            <Kpi label="Clientes cadastrados" indicador={hoje.novosClientes} href="/clientes" />
            {veOS && <Kpi label="OS em andamento" indicador={hoje.osEmAndamento} href="/assistencia" />}
            {veOS && <Kpi label="Entregas previstas" indicador={hoje.entregasPrevistas} href="/assistencia" />}
          </div>
        </Secao>
      </div>

      {gestao && (
        <Secao titulo="Visão geral" acao={<Link href="/analytics" className="text-xs font-medium text-primary hover:underline">Analytics completo</Link>}>
          {graficos ? (
            <GraficosDashboard vendasPorPeriodo={graficos[0]} origemClientes={graficos[1]} funilCRM={graficos[2]} desempenhoEquipe={graficos[3]} />
          ) : (
            <p className={cn("rounded-card border border-border bg-card p-4 text-sm text-muted-foreground")}>Os gráficos não puderam ser carregados agora.</p>
          )}
        </Secao>
      )}
    </div>
  );
}
