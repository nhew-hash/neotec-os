import { createClient } from "@/lib/supabase/server";
import { listarSaldosProdutos } from "@/services/estoque/estoque.service";

export type CategoriaAlerta = "financeiro" | "marketing" | "comercial" | "ecommerce";

export interface Alerta {
  categoria: CategoriaAlerta;
  mensagem: string;
}

/**
 * Sistema de Alertas (Seção 42). Computado sob demanda a partir de dado
 * real já existente — não é uma tabela nova (evita duplicar
 * `performance_diagnosticos`, que já cobre CAC/margem/fadiga). Cobre o
 * que o schema atual permite checar; um item da Seção 42 ficou de fora
 * por não existir, hoje, um jeito de detectar "erro de pagamento" — o
 * `pedidos_loja.status` não distingue cancelamento por erro de
 * pagamento de cancelamento por outro motivo (ver StatusPedidoLoja).
 */
export async function obterAlertas(): Promise<Alerta[]> {
  const supabase = await createClient();
  const alertas: Alerta[] = [];

  const [{ data: config }, { data: metricasHoje }, { data: conversasAbertas }, saldos, { data: itensRecentes }, { data: carrinhosRecentes }, { data: pedidosRecentes }, { data: carrinhosAnteriores }, { data: pedidosAnteriores }] =
    await Promise.all([
      supabase.from("neo_performance_config").select("limite_diario, cac_maximo").maybeSingle(),
      supabase.from("ads_metricas_diarias").select("gasto").eq("data", new Date().toISOString().slice(0, 10)),
      supabase.from("whatsapp_conversas").select("nao_lidas, created_at, primeira_resposta_em").eq("status", "aberta"),
      listarSaldosProdutos(),
      supabase.from("venda_itens").select("produto_id, venda:vendas!inner(status, data_venda)").gte("venda.data_venda", diasAtras(7)).eq("venda.status", "concluida").not("produto_id", "is", null),
      supabase.from("loja_eventos").select("id").eq("tipo", "add_to_cart").gte("criado_em", diasAtras(7)),
      supabase.from("pedidos_loja").select("id").eq("status", "concluido").gte("created_at", diasAtras(7)),
      supabase.from("loja_eventos").select("id").eq("tipo", "add_to_cart").gte("criado_em", diasAtras(14)).lt("criado_em", diasAtras(7)),
      supabase.from("pedidos_loja").select("id").eq("status", "concluido").gte("created_at", diasAtras(14)).lt("created_at", diasAtras(7)),
    ]);

  // --- Financeiro ---
  const gastoHoje = (metricasHoje ?? []).reduce((a, m) => a + Number(m.gasto), 0);
  if (config?.limite_diario != null && gastoHoje > config.limite_diario) {
    alertas.push({ categoria: "financeiro", mensagem: `Gasto de hoje (R$ ${gastoHoje.toFixed(2)}) já passou do limite diário (R$ ${config.limite_diario.toFixed(2)}).` });
  }

  // --- Comercial: leads sem resposta ---
  const DUAS_HORAS = 2 * 60 * 60 * 1000;
  const semResposta = (conversasAbertas ?? []).filter((c) => !c.primeira_resposta_em && Date.now() - new Date(c.created_at).getTime() > DUAS_HORAS);
  if (semResposta.length > 0) {
    alertas.push({ categoria: "comercial", mensagem: `${semResposta.length} conversa(s) aberta(s) há mais de 2h sem primeira resposta.` });
  }

  // --- E-commerce: produto sem estoque mas com venda recente ---
  const produtosComVendaRecente = new Set((itensRecentes ?? []).map((i) => i.produto_id).filter(Boolean) as string[]);
  const semEstoque = [...produtosComVendaRecente].filter((id) => (saldos.get(id) ?? 0) <= 0);
  if (semEstoque.length > 0) {
    alertas.push({ categoria: "ecommerce", mensagem: `${semEstoque.length} produto(s) com venda nos últimos 7 dias e estoque zerado agora.` });
  }

  // --- E-commerce: checkout com queda (carrinho→compra) ---
  const taxaRecente = (carrinhosRecentes ?? []).length > 0 ? (pedidosRecentes ?? []).length / (carrinhosRecentes ?? []).length : null;
  const taxaAnterior = (carrinhosAnteriores ?? []).length > 0 ? (pedidosAnteriores ?? []).length / (carrinhosAnteriores ?? []).length : null;
  if (taxaRecente != null && taxaAnterior != null && taxaAnterior > 0 && taxaRecente < taxaAnterior * 0.7) {
    alertas.push({ categoria: "ecommerce", mensagem: `Taxa de carrinho→compra caiu de ${(taxaAnterior * 100).toFixed(1)}% para ${(taxaRecente * 100).toFixed(1)}% na última semana.` });
  }

  return alertas;
}

function diasAtras(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}
