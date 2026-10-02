import { createClient } from "@/lib/supabase/server";
import type { AdsConta, AdsCampanha, AdsMetricaDiaria, AdsSyncLog, PlataformaAds, OperacaoCampanha } from "@/types";

// ---- Contas ----

export async function listarContas(): Promise<AdsConta[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("ads_contas").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(`Não foi possível carregar as contas de anúncio: ${error.message}`);
  return data ?? [];
}

export async function conectarConta(input: { plataforma: PlataformaAds; conta_externa_id: string; nome?: string }): Promise<AdsConta> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ads_contas")
    .insert({ plataforma: input.plataforma, conta_externa_id: input.conta_externa_id, nome: input.nome ?? null, ativo: true, conectado_em: new Date().toISOString() })
    .select("*")
    .single();
  if (error) throw new Error(`Não foi possível conectar a conta: ${error.message}`);
  return data;
}

// ---- Campanhas ----

export async function listarCampanhas(filtro?: { plataforma?: PlataformaAds; operacao?: OperacaoCampanha }): Promise<AdsCampanha[]> {
  const supabase = await createClient();
  let query = supabase.from("ads_campanhas").select("*").order("created_at", { ascending: false });
  if (filtro?.plataforma) query = query.eq("plataforma", filtro.plataforma);
  if (filtro?.operacao) query = query.eq("operacao", filtro.operacao);
  const { data, error } = await query;
  if (error) throw new Error(`Não foi possível carregar as campanhas: ${error.message}`);
  return data ?? [];
}

export async function criarOuAtualizarCampanha(input: {
  conta_id: string;
  plataforma: PlataformaAds;
  external_campaign_id: string;
  nome: string;
  objetivo?: string;
  status?: string;
  orcamento_diario?: number;
  operacao?: OperacaoCampanha;
}): Promise<AdsCampanha> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ads_campanhas")
    .upsert(
      {
        conta_id: input.conta_id,
        plataforma: input.plataforma,
        external_campaign_id: input.external_campaign_id,
        nome: input.nome,
        objetivo: input.objetivo ?? null,
        status: input.status ?? null,
        orcamento_diario: input.orcamento_diario ?? null,
        operacao: input.operacao ?? "local",
      },
      { onConflict: "conta_id,external_campaign_id" }
    )
    .select("*")
    .single();
  if (error) throw new Error(`Não foi possível salvar a campanha: ${error.message}`);
  return data;
}

// ---- Métricas diárias ----

export async function registrarMetricaDiaria(input: {
  campanha_id: string;
  data: string;
  gasto: number;
  impressoes?: number;
  alcance?: number;
  frequencia?: number;
  cliques?: number;
  cpm?: number;
  ctr?: number;
  cpc?: number;
  leads?: number;
  conversas?: number;
  conversoes?: number;
  compras?: number;
  custo_por_resultado?: number;
  valor_conversao?: number;
}): Promise<AdsMetricaDiaria> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ads_metricas_diarias")
    .upsert(
      {
        campanha_id: input.campanha_id,
        data: input.data,
        gasto: input.gasto,
        impressoes: input.impressoes ?? 0,
        alcance: input.alcance ?? 0,
        frequencia: input.frequencia ?? null,
        cliques: input.cliques ?? 0,
        cpm: input.cpm ?? null,
        ctr: input.ctr ?? null,
        cpc: input.cpc ?? null,
        leads: input.leads ?? 0,
        conversas: input.conversas ?? 0,
        conversoes: input.conversoes ?? 0,
        compras: input.compras ?? 0,
        custo_por_resultado: input.custo_por_resultado ?? null,
        valor_conversao: input.valor_conversao ?? null,
      },
      { onConflict: "campanha_id,data" }
    )
    .select("*")
    .single();
  if (error) throw new Error(`Não foi possível registrar a métrica: ${error.message}`);
  return data;
}

export async function listarMetricasPeriodo(dataInicioISO: string, dataFimISO: string): Promise<AdsMetricaDiaria[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ads_metricas_diarias")
    .select("*")
    .gte("data", dataInicioISO)
    .lte("data", dataFimISO)
    .order("data");
  if (error) throw new Error(`Não foi possível carregar as métricas: ${error.message}`);
  return data ?? [];
}

/**
 * Sincronização real com Meta/Google Ads. NÃO IMPLEMENTADA NESTA FASE:
 * depende de credenciais que não existem configuradas ainda
 * (META_ADS_ACCESS_TOKEN/APP_SECRET/AD_ACCOUNT_ID ou os 5 GOOGLE_ADS_* —
 * já documentados em .env.local.example, só faltam ser preenchidos). A regra 61 do
 * prompt mestre proíbe "fingir que uma integração funciona", então esta
 * função apenas registra o log do que SERIA uma tentativa de sync, para
 * a UI poder mostrar "sincronização pendente de configuração" em vez de
 * inventar dado. Quando a conta/token existir, o corpo desta função é
 * onde a chamada real às APIs do Meta/Google entra.
 */
export async function sincronizar(contaId: string): Promise<AdsSyncLog> {
  const supabase = await createClient();
  const { data: conta } = await supabase.from("ads_contas").select("conectado_em, plataforma").eq("id", contaId).maybeSingle();

  const credenciaisMeta = Boolean(process.env.META_ADS_ACCESS_TOKEN && process.env.META_ADS_APP_SECRET && process.env.META_ADS_AD_ACCOUNT_ID);
  const credenciaisGoogle = Boolean(
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN && process.env.GOOGLE_ADS_CLIENT_ID && process.env.GOOGLE_ADS_CLIENT_SECRET &&
    process.env.GOOGLE_ADS_REFRESH_TOKEN && process.env.GOOGLE_ADS_CUSTOMER_ID
  );
  const temCredencial = conta?.plataforma === "meta" ? credenciaisMeta : credenciaisGoogle;

  const { data, error } = await supabase
    .from("ads_sync_log")
    .insert({
      conta_id: contaId,
      status: "erro",
      erro: temCredencial
        ? "Credenciais configuradas, mas a chamada real à API ainda não foi implementada nesta fase."
        : `Conta sem credenciais configuradas — preencha as variáveis de ${conta?.plataforma === "meta" ? "META_ADS_*" : "GOOGLE_ADS_*"} em .env.local.`,
      concluido_em: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) throw new Error(`Não foi possível registrar a tentativa de sincronização: ${error.message}`);
  return data;
}

export async function listarSyncLog(contaId: string): Promise<AdsSyncLog[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("ads_sync_log").select("*").eq("conta_id", contaId).order("iniciado_em", { ascending: false }).limit(20);
  if (error) throw new Error(`Não foi possível carregar o histórico de sincronização: ${error.message}`);
  return data ?? [];
}
