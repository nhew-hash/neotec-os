import { Users, Eye, ShoppingCart, DollarSign, TrendingUp } from "lucide-react";
import {
  obterResumoLojaAnalytics, obterAtividadeRecente, obterProdutosDestaque, obterOrigemAcessos, obterGraficoVisitantes,
} from "@/services/analytics/loja-analytics.service";
import { MetricaCard } from "@/components/analytics-loja/metrica-card";
import { OnlineAgoraCard } from "@/components/analytics-loja/online-agora-card";
import { GraficoVisitantes } from "@/components/analytics-loja/grafico-visitantes";
import { AtividadeTempoReal } from "@/components/analytics-loja/atividade-tempo-real";
import { ProdutosDestaqueTable } from "@/components/analytics-loja/produtos-destaque-table";
import { FunilConversao } from "@/components/analytics-loja/funil-conversao";
import { OrigemAcessos } from "@/components/analytics-loja/origem-acessos";
import { formatCurrency } from "@/utils";

/**
 * Analytics da Loja Virtual — V1. Foco em tráfego/comportamento do
 * visitante (visitantes, views, carrinho, conversão, origem) — não
 * confundir com `/analytics` (financeiro/lucro, já existente, mantido
 * intacto). Atualiza automaticamente em 3 pontos (online agora,
 * atividade recente, gráfico) via polling client-side, sem precisar
 * recarregar a página.
 */
export default async function LojaAnalyticsPage() {
  const [resumo, atividade, produtos, origens, graficoHoje] = await Promise.all([
    obterResumoLojaAnalytics(), obterAtividadeRecente(), obterProdutosDestaque(), obterOrigemAcessos(), obterGraficoVisitantes("hoje"),
  ]);

  return (
    <div className="flex flex-col gap-6">
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

      {/* 6. Origem do acesso */}
      <OrigemAcessos origens={origens} />
    </div>
  );
}
