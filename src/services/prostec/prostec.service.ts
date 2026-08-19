import { createClient } from "@/lib/supabase/server";

export interface ProstecLead {
  id: string;
  company_id: string;
  segment: string;
  score: number;
  temperature: "quente" | "morno" | "frio";
  status: string;
  assigned_to: string | null;
  approach_suggestion: string;
  created_at: string;
  company: { name: string; city: string; state: string; phone: string | null; whatsapp: string | null; website: string | null } | null;
}

export async function listarLeadsProstec(): Promise<ProstecLead[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prostec_leads")
    .select("*, company:prostec_companies(name, city, state, phone, whatsapp, website)")
    .order("score", { ascending: false });

  if (error) throw new Error(`Não foi possível carregar os leads: ${error.message}`);
  return (data ?? []) as unknown as ProstecLead[];
}

export interface DashboardProstec {
  totalLeads: number;
  leadsQuentes: number;
  vendasMes: number;
  faturamentoMes: number;
  comissaoMes: number;
}

export async function obterDashboardProstec(): Promise<DashboardProstec> {
  const supabase = await createClient();
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const [{ count: totalLeads }, { count: leadsQuentes }, { data: vendasMesData }, { data: comissoesMesData }] = await Promise.all([
    supabase.from("prostec_leads").select("*", { count: "exact", head: true }),
    supabase.from("prostec_leads").select("*", { count: "exact", head: true }).eq("temperature", "quente"),
    supabase.from("prostec_sales").select("amount").gte("closed_at", inicioMes.toISOString()),
    supabase.from("prostec_commissions").select("amount").gte("created_at", inicioMes.toISOString()),
  ]);

  return {
    totalLeads: totalLeads ?? 0,
    leadsQuentes: leadsQuentes ?? 0,
    vendasMes: vendasMesData?.length ?? 0,
    faturamentoMes: (vendasMesData ?? []).reduce((acc, v) => acc + Number(v.amount), 0),
    comissaoMes: (comissoesMesData ?? []).reduce((acc, c) => acc + Number(c.amount), 0),
  };
}

export interface ProstecCompany {
  id: string; name: string; category: string; city: string; state: string;
  phone: string | null; whatsapp: string | null; website: string | null;
  instagram: string | null; rating: number | null; reviews_count: number | null;
  is_demo_data: boolean; created_at: string;
  lead: { id: string; score: number; temperature: string; status: string } | null;
}

export async function listarEmpresasProstec(): Promise<ProstecCompany[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prostec_companies")
    .select("*, lead:prostec_leads(id, score, temperature, status)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Não foi possível carregar as empresas: ${error.message}`);
  return (data ?? []).map((c) => ({ ...c, lead: Array.isArray(c.lead) ? c.lead[0] ?? null : c.lead })) as unknown as ProstecCompany[];
}

export interface ProstecLeadDetalhe extends ProstecLead {
  company_full: { name: string; category: string; city: string; state: string; address: string | null; phone: string | null; whatsapp: string | null; website: string | null; instagram: string | null; rating: number | null; reviews_count: number | null } | null;
  contacts: { id: string; contact_type: string; result: string; notes: string | null; created_at: string; user: { nome: string } | null }[];
  notes: { id: string; note: string; created_at: string; user: { nome: string } | null }[];
  followups: { id: string; next_contact_date: string; next_contact_time: string | null; observation: string | null; done: boolean }[];
  statusHistory: { id: string; from_status: string | null; to_status: string; created_at: string; user: { nome: string } | null }[];
}

export async function buscarLeadProstecPorId(id: string): Promise<ProstecLeadDetalhe | null> {
  const supabase = await createClient();

  const [{ data: lead }, { data: contacts }, { data: notes }, { data: followups }, { data: statusHistory }] = await Promise.all([
    supabase.from("prostec_leads").select("*, company:prostec_companies(name, city, state, phone, whatsapp, website), company_full:prostec_companies(name, category, city, state, address, phone, whatsapp, website, instagram, rating, reviews_count)").eq("id", id).maybeSingle(),
    supabase.from("prostec_lead_contacts").select("id, contact_type, result, notes, created_at, user:usuarios(nome)").eq("lead_id", id).order("created_at", { ascending: false }),
    supabase.from("prostec_lead_notes").select("id, note, created_at, user:usuarios(nome)").eq("lead_id", id).order("created_at", { ascending: false }),
    supabase.from("prostec_lead_followups").select("id, next_contact_date, next_contact_time, observation, done").eq("lead_id", id).order("next_contact_date"),
    supabase.from("prostec_lead_status_history").select("id, from_status, to_status, created_at, user:usuarios(nome)").eq("lead_id", id).order("created_at", { ascending: false }),
  ]);

  if (!lead) return null;

  const companyFull = Array.isArray(lead.company_full) ? lead.company_full[0] ?? null : lead.company_full;

  return {
    ...(lead as unknown as ProstecLead),
    company_full: companyFull,
    contacts: (contacts ?? []) as unknown as ProstecLeadDetalhe["contacts"],
    notes: (notes ?? []) as unknown as ProstecLeadDetalhe["notes"],
    followups: (followups ?? []) as unknown as ProstecLeadDetalhe["followups"],
    statusHistory: (statusHistory ?? []) as unknown as ProstecLeadDetalhe["statusHistory"],
  };
}

export interface ProstecSettings {
  score_quente_min: number;
  score_morno_min: number;
  segmentos_disponiveis: string[];
  cidades_sugeridas: string[];
  raio_padrao_km: number;
  quantidade_padrao: number;
  comissao_pct_padrao: number;
  valor_venda_padrao: number;
  status_disponiveis: string[];
}

export async function buscarConfiguracoesProstec(): Promise<ProstecSettings> {
  const supabase = await createClient();
  const { data } = await supabase.from("prostec_settings").select("*").eq("id", "default").maybeSingle();
  return {
    score_quente_min: data?.score_quente_min ?? 80,
    score_morno_min: data?.score_morno_min ?? 60,
    segmentos_disponiveis: data?.segmentos_disponiveis ?? [],
    cidades_sugeridas: data?.cidades_sugeridas ?? [],
    raio_padrao_km: data?.raio_padrao_km ?? 50,
    quantidade_padrao: data?.quantidade_padrao ?? 50,
    comissao_pct_padrao: data?.comissao_pct_padrao ?? 10,
    valor_venda_padrao: data?.valor_venda_padrao ?? 1497,
    status_disponiveis: data?.status_disponiveis?.length ? data.status_disponiveis : ["novo", "em_contato", "negociando", "vendido", "perdido"],
  };
}

export interface ComissaoPorVendedor {
  usuario_id: string;
  nome: string;
  totalVendas: number;
  faturamentoGerado: number;
  comissaoTotal: number;
}

export async function obterComissaoPorVendedor(): Promise<ComissaoPorVendedor[]> {
  const supabase = await createClient();

  const [{ data: vendas }, { data: comissoes }, { data: vendedores }] = await Promise.all([
    supabase.from("prostec_sales").select("user_id, amount"),
    supabase.from("prostec_commissions").select("user_id, amount"),
    supabase.from("usuarios").select("id, nome").eq("cargo", "vendedor_prostec"),
  ]);

  const mapa = new Map<string, ComissaoPorVendedor>();
  for (const v of vendedores ?? []) {
    mapa.set(v.id, { usuario_id: v.id, nome: v.nome, totalVendas: 0, faturamentoGerado: 0, comissaoTotal: 0 });
  }

  for (const v of vendas ?? []) {
    if (!v.user_id) continue;
    const atual = mapa.get(v.user_id);
    if (atual) { atual.totalVendas++; atual.faturamentoGerado += Number(v.amount); }
  }

  for (const c of comissoes ?? []) {
    if (!c.user_id) continue;
    const atual = mapa.get(c.user_id);
    if (atual) atual.comissaoTotal += Number(c.amount);
  }

  return Array.from(mapa.values()).sort((a, b) => b.comissaoTotal - a.comissaoTotal);
}
