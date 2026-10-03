import { redirect } from "next/navigation";
import { Users, Eye, ShoppingCart, DollarSign, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  obterResumoLojaAnalytics, obterAtividadeRecente, obterProdutosDestaque, obterOrigemAcessos, obterGraficoVisitantes, obterResumoMarketing,
} from "@/services/analytics/loja-analytics.service";
import { MarketingCampanhas } from "@/components/analytics-loja/marketing-campanhas";
import { MetricaCard } from "@/components/analytics-loja/metrica-card";
import { OnlineAgoraCard } from "@/components/analytics-loja/online-agora-card";
import { GraficoVisitantes } from "@/components/analytics-loja/grafico-visitantes";
import { AtividadeTempoReal } from "@/components/analytics-loja/atividade-tempo-real";
import { ProdutosDestaqueTable } from "@/components/analytics-loja/produtos-destaque-table";
import { FunilConversao } from "@/components/analytics-loja/funil-conversao";
import { OrigemAcessos } from "@/components/analytics-loja/origem-acessos";
import { AutoRefreshPainel } from "@/components/analytics-loja/auto-refresh-painel";
import { podeVerCusto } from "@/utils/permissions";
import { formatCurrency } from "@/utils";
import type { CargoUsuario } from "@/types";

/**
 * Fase 255 — auditoria de "Atividade agora" encontrou números
 * congelados mesmo depois de eventos novos confirmados no banco (teste
 * ao vivo: 3 requisições de tracking com 200 OK, zero mudança nos
 * cards mesmo com cache-busting de URL). A causa mais provável é o
 * Data Cache do Next reaproveitando as respostas `fetch` das queries
 * Supabase entre requisições — força-dinâmico + revalidate 0 garantem
 * que cada carregamento desta página dispara leituras novas de verdade.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Analytics da Loja Virtual — V1. Foco em tráfego/comportamento do
 * visitante (visitantes, views, carrinho, conversão, origem) — não
 * confundir com `/analytics` (financeiro/lucro, já existente, mantido
 * intacto). Atualiza automaticamente em 3 pontos (online agora,
 * atividade recente, gráfico) via polling client-side, sem precisar
 * recarregar a página.
 */
export default async function LojaAnalyticsPage() {
  // Fase 254 (C6): faltava esta checagem — a tabela `loja_sessoes`/
  // `loja_eventos` também teve o RLS apertado pra admin/gerente na
  // mesma migração, mas a página em si não bloqueava nada além de
  // esconder o link do menu. Mesma regra usada em `/analytics`.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: perfil } = await supabase
    .from("usuarios").select("cargo").eq("id", user?.id ?? "").single<{ cargo: CargoUsuario }>();
  if (!perfil || !podeVerCusto(perfil.cargo)) redirect("/dashboard");

  const [resumo, atividade, produtos, origens, graficoHoje, marketing] = await Promise.all([
    obterResumoLojaAnalytics(), obterAtividadeRecente(), obterProdutosDestaque(), obterOrigemAcessos(), obterGraficoVisitantes("hoje"), obterResumoMarketing(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <AutoRefreshPainel />
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Analytics da Loja</h1>
        <p className="text-sm text-muted-foreground">Movimento da loja virtual em tempo real</p>
      </div>

      {/* 1. Resumo principal */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <OnlineAgoraCard valorInicial={resumo.onlineAgora} />
        <MetricaCard titulo="Visitantes" icon={Users} metrica={resumo.visitantes} />
        <MetricaCard titulo="Visualizações" icon={Eye} metrica={resumo.visualizacoes} />
        <MetricaCard titulo="Carrinhos" icon={ShoppingCart} metrica={resumo.carrinhos} />
        <MetricaCard titulo="Vendas" icon={TrendingUp} metrica={resumo.vendas} destaque="success" />
        <MetricaCard titulo="Faturamento" icon={DollarSign} metrica={resumo.faturamento} formatador={formatCurrency} destaque="success" />
      </div>

      {/* 2. Gráfico + 3. Atividade em tempo real, lado a lado */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        <GraficoVisitantes dadosIniciais={graficoHoje} />
        <AtividadeTempoReal atividadesIniciais={atividade} />
      </div>

      {/* 4. Produtos em destaque + 5. Conversão */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <ProdutosDestaqueTable produtos={produtos} />
        <FunilConversao resumo={resumo} />
      </div>

      {/* 6. Origem do acesso + 7. Marketing (Fase 262) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr]">
        <OrigemAcessos origens={origens} />
        <MarketingCampanhas resumo={marketing} />
      </div>
    </div>
  );
}
