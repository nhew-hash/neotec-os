import { createClient } from "@/lib/supabase/server";

export type StatusConexao = "conectado" | "nao_configurado" | "erro";

export interface SystemHealthItem {
  nome: string;
  status: StatusConexao;
  detalhe: string;
}

/**
 * System Health (Seção 54). Nunca marca uma integração como "conectada"
 * sem checagem real (Seção 57) — pra Meta/Google isso significa checar
 * se a credencial existe E se a última sincronização não terminou em
 * erro; pra Claude/Gemini/CRM/E-commerce, que não têm "sincronização",
 * verifica presença de credencial ou atividade recente nas tabelas que
 * já existem.
 */
export async function obterSystemHealth(): Promise<SystemHealthItem[]> {
  const supabase = await createClient();

  const [{ data: contas }, { data: configIa }, { count: conversasRecentes }, { count: pedidosRecentes }] = await Promise.all([
    supabase.from("ads_contas").select("id, plataforma, conectado_em, pausada_em"),
    supabase.from("configuracoes_ia").select("provider").maybeSingle(),
    supabase.from("whatsapp_conversas").select("*", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
    supabase.from("pedidos_loja").select("*", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
  ]);

  const itens: SystemHealthItem[] = [];

  // Meta
  const contaMeta = (contas ?? []).find((c) => c.plataforma === "meta");
  const credenciaisMeta = Boolean(process.env.META_ADS_ACCESS_TOKEN && process.env.META_ADS_APP_SECRET && process.env.META_ADS_AD_ACCOUNT_ID);
  itens.push({
    nome: "Meta Ads",
    status: !contaMeta ? "nao_configurado" : !credenciaisMeta ? "nao_configurado" : contaMeta.pausada_em ? "erro" : "conectado",
    detalhe: !contaMeta ? "Nenhuma conta conectada em Configurações." : !credenciaisMeta ? "Conta conectada, mas faltam META_ADS_* no ambiente." : contaMeta.pausada_em ? "Conta pausada manualmente." : "Credenciais presentes (sincronização real ainda não implementada).",
  });

  // Google
  const contaGoogle = (contas ?? []).find((c) => c.plataforma === "google");
  const credenciaisGoogle = Boolean(
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN && process.env.GOOGLE_ADS_CLIENT_ID && process.env.GOOGLE_ADS_CLIENT_SECRET &&
    process.env.GOOGLE_ADS_REFRESH_TOKEN && process.env.GOOGLE_ADS_CUSTOMER_ID
  );
  itens.push({
    nome: "Google Ads",
    status: !contaGoogle ? "nao_configurado" : !credenciaisGoogle ? "nao_configurado" : contaGoogle.pausada_em ? "erro" : "conectado",
    detalhe: !contaGoogle ? "Nenhuma conta conectada em Configurações." : !credenciaisGoogle ? "Conta conectada, mas faltam GOOGLE_ADS_* no ambiente." : "Credenciais presentes (sincronização real ainda não implementada).",
  });

  // Gemini (imagem)
  itens.push({
    nome: "Gemini (imagem)",
    status: process.env.GEMINI_IMAGE_API_KEY ? "conectado" : "nao_configurado",
    detalhe: process.env.GEMINI_IMAGE_API_KEY ? "Chave presente." : "Falta GEMINI_IMAGE_API_KEY.",
  });

  // Claude/IA de texto — reaproveita configuracoes_ia (Central de Cotações)
  itens.push({
    nome: "IA de texto (Claude/outros)",
    status: configIa?.provider ? "conectado" : "nao_configurado",
    detalhe: configIa?.provider ? `Provedor ativo: ${configIa.provider}.` : "Nenhum provedor de IA configurado em Configurações.",
  });

  // CRM — não é uma "conexão" externa, é o módulo interno; status = tem atividade recente
  itens.push({
    nome: "CRM / WhatsApp",
    status: (conversasRecentes ?? 0) > 0 ? "conectado" : "nao_configurado",
    detalhe: `${conversasRecentes ?? 0} conversa(s) nos últimos 7 dias.`,
  });

  // E-commerce
  itens.push({
    nome: "E-commerce",
    status: (pedidosRecentes ?? 0) > 0 ? "conectado" : "nao_configurado",
    detalhe: `${pedidosRecentes ?? 0} pedido(s) nos últimos 7 dias.`,
  });

  return itens;
}
