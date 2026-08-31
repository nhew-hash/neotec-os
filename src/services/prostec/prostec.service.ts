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

export interface FunilProstec {
  novo: number; contato_realizado: number; qualificado: number; reuniao: number;
  proposta_enviada: number; negociacao: number; venda_fechada: number; perdido: number;
}

export async function obterFunilProstec(): Promise<FunilProstec> {
  const supabase = await createClient();
  const { data } = await supabase.from("prostec_leads").select("status");

  const funil: FunilProstec = { novo: 0, contato_realizado: 0, qualificado: 0, reuniao: 0, proposta_enviada: 0, negociacao: 0, venda_fechada: 0, perdido: 0 };
  for (const lead of data ?? []) {
    if (lead.status in funil) funil[lead.status as keyof FunilProstec]++;
  }
  return funil;
}

export interface AtividadeProstec {
  id: string;
  tipo: string;
  descricao: string;
  created_at: string;
  lead_empresa_nome: string | null;
  usuario_nome: string | null;
}

export async function listarAtividadesProstec(limite = 20): Promise<AtividadeProstec[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("prostec_atividades")
    .select("id, tipo, descricao, created_at, lead:prostec_leads(company:prostec_companies(name)), usuario:usuarios(nome)")
    .order("created_at", { ascending: false })
    .limit(limite);

  return (data ?? []).map((a) => {
    const lead = a.lead as unknown as { company: { name: string } | null } | null;
    const usuario = a.usuario as unknown as { nome: string } | null;
    return { id: a.id, tipo: a.tipo, descricao: a.descricao, created_at: a.created_at, lead_empresa_nome: lead?.company?.name ?? null, usuario_nome: usuario?.nome ?? null };
  });
}

/** Follow-ups atrasados/hoje — pro dashboard nunca deixar o vendedor esquecer, pedido explícito do documento. */
export async function obterResumoFollowupsProstec(): Promise<{ atrasados: number; hoje: number; proximos: number }> {
  const supabase = await createClient();
  const agora = new Date();
  const hojeInicio = new Date(agora); hojeInicio.setHours(0, 0, 0, 0);
  const hojeFim = new Date(agora); hojeFim.setHours(23, 59, 59, 999);

  const [{ count: atrasados }, { count: hoje }, { count: proximos }] = await Promise.all([
    supabase.from("prostec_lead_followups").select("*", { count: "exact", head: true }).eq("done", false).lt("next_contact_date", hojeInicio.toISOString().slice(0, 10)),
    supabase.from("prostec_lead_followups").select("*", { count: "exact", head: true }).eq("done", false).eq("next_contact_date", hojeInicio.toISOString().slice(0, 10)),
    supabase.from("prostec_lead_followups").select("*", { count: "exact", head: true }).eq("done", false).gt("next_contact_date", hojeInicio.toISOString().slice(0, 10)),
  ]);

  return { atrasados: atrasados ?? 0, hoje: hoje ?? 0, proximos: proximos ?? 0 };
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

export interface RankingVendedor {
  usuario_id: string;
  nome: string;
  metaMes: number;
  faturamentoMes: number;
  vendasMes: number;
  progressoPct: number;
}

/** Ranking do mês atual — meta configurada + faturamento realizado, ordenado por quem vendeu mais. Pedido explícito do documento pra criar "competição saudável". */
export async function obterRankingVendedores(): Promise<RankingVendedor[]> {
  const supabase = await createClient();
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);
  const mesRef = inicioMes.toISOString().slice(0, 10);

  const [{ data: vendedores }, { data: metas }, { data: vendas }] = await Promise.all([
    supabase.from("usuarios").select("id, nome").eq("cargo", "vendedor_prostec"),
    supabase.from("prostec_metas").select("usuario_id, valor_meta").eq("mes", mesRef),
    supabase.from("prostec_sales").select("user_id, amount").gte("closed_at", inicioMes.toISOString()),
  ]);

  const mapaMetas = new Map((metas ?? []).map((m) => [m.usuario_id, Number(m.valor_meta)]));
  const ranking: RankingVendedor[] = (vendedores ?? []).map((v) => {
    const vendasDoVendedor = (vendas ?? []).filter((s) => s.user_id === v.id);
    const faturamentoMes = vendasDoVendedor.reduce((acc, s) => acc + Number(s.amount), 0);
    const metaMes = mapaMetas.get(v.id) ?? 0;
    return { usuario_id: v.id, nome: v.nome, metaMes, faturamentoMes, vendasMes: vendasDoVendedor.length, progressoPct: metaMes > 0 ? Math.round((faturamentoMes / metaMes) * 100) : 0 };
  });

  return ranking.sort((a, b) => b.faturamentoMes - a.faturamentoMes);
}

export interface ProstecProposta {
  id: string;
  produto: string;
  valor: number;
  forma_pagamento: string | null;
  status: string;
  token_publico: string;
  visualizacoes: number;
  primeira_visualizacao_em: string | null;
  created_at: string;
}

export async function listarPropostasDoLead(leadId: string): Promise<ProstecProposta[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("prostec_propostas").select("*").eq("lead_id", leadId).order("created_at", { ascending: false });
  return data ?? [];
}

export interface PropostaPublica {
  id: string;
  produto: string;
  valor: number;
  forma_pagamento: string | null;
  status: string;
  empresa_nome: string | null;
}

/** Busca proposta pelo token público — sem exigir login, é o link que o cliente recebe. Já registra a visualização na mesma consulta. */
export async function buscarPropostaPublicaPorToken(token: string): Promise<PropostaPublica | null> {
  const supabase = await createClient();
  const { data: proposta } = await supabase.from("prostec_propostas").select("id, produto, valor, forma_pagamento, status, visualizacoes, primeira_visualizacao_em, lead:prostec_leads(company:prostec_companies(name))").eq("token_publico", token).maybeSingle();
  if (!proposta) return null;

  await supabase.from("prostec_propostas").update({
    visualizacoes: proposta.visualizacoes + 1,
    primeira_visualizacao_em: proposta.primeira_visualizacao_em ?? new Date().toISOString(),
    ultima_visualizacao_em: new Date().toISOString(),
    status: proposta.status === "enviada" ? "visualizada" : proposta.status,
  }).eq("id", proposta.id);

  const lead = proposta.lead as unknown as { company: { name: string } | null } | null;
  return { id: proposta.id, produto: proposta.produto, valor: proposta.valor, forma_pagamento: proposta.forma_pagamento, status: proposta.status, empresa_nome: lead?.company?.name ?? null };
}

/**
 * Follow-up automático — pedido explícito do documento: dia 1, 3 e 7
 * depois de proposta enviada sem resposta, cria um lembrete de
 * follow-up com sugestão de mensagem pronta. Nunca duplica (confere
 * se já existe um follow-up pendente pra aquele dia antes de criar).
 */
export async function gerarFollowupsAutomaticosProstec(): Promise<{ criados: number }> {
  const supabase = await createClient();
  const agora = new Date();

  const { data: propostasPendentes } = await supabase
    .from("prostec_propostas")
    .select("id, lead_id, produto, created_at")
    .in("status", ["enviada", "visualizada"]);

  const MENSAGENS_POR_DIA: Record<number, string> = {
    1: "Oi, tudo bem? Conseguiu dar uma olhada na proposta que te enviei?",
    3: "Passando pra saber se ficou alguma dúvida sobre o projeto.",
    7: "Ainda faz sentido conversarmos sobre o site da empresa?",
  };

  let criados = 0;

  for (const proposta of propostasPendentes ?? []) {
    const diasPassados = Math.floor((agora.getTime() - new Date(proposta.created_at).getTime()) / (1000 * 60 * 60 * 24));
    if (![1, 3, 7].includes(diasPassados)) continue;

    const dataAlvo = new Date(proposta.created_at);
    dataAlvo.setDate(dataAlvo.getDate() + diasPassados);
    const dataAlvoStr = dataAlvo.toISOString().slice(0, 10);

    const { data: jaExiste } = await supabase
      .from("prostec_lead_followups")
      .select("id")
      .eq("lead_id", proposta.lead_id)
      .eq("next_contact_date", dataAlvoStr)
      .eq("observation", MENSAGENS_POR_DIA[diasPassados])
      .maybeSingle();
    if (jaExiste) continue;

    await supabase.from("prostec_lead_followups").insert({
      lead_id: proposta.lead_id, next_contact_date: dataAlvoStr, observation: MENSAGENS_POR_DIA[diasPassados],
    });
    criados++;
  }

  // Dia 15 sem resposta — registra como atividade (nutrição futura),
  // não move de status sozinho (decisão do vendedor, não automática).
  for (const proposta of propostasPendentes ?? []) {
    const diasPassados = Math.floor((agora.getTime() - new Date(proposta.created_at).getTime()) / (1000 * 60 * 60 * 24));
    if (diasPassados !== 15) continue;
    await supabase.from("prostec_atividades").insert({
      lead_id: proposta.lead_id, tipo: "nutricao",
      descricao: `⏳ 15 dias sem resposta na proposta "${proposta.produto}" — considera mover pra nutrição ou marcar como perdido.`,
    });
  }

  return { criados };
}

export interface ProstecOferta {
  produto: string;
  preco: number;
  formas_pagamento: string;
  prazo_entrega: string;
  incluso: string;
  nao_incluso: string;
  desconto_maximo_automatico_pct: number;
  parcelamento_maximo: number;
}

/** Única fonte de verdade que a Iara usa pra nunca inventar preço/condição — configurada aqui, lida direto por ela a cada conversa. */
export async function buscarOfertaProstec(): Promise<ProstecOferta> {
  const supabase = await createClient();
  const { data } = await supabase.from("prostec_oferta").select("*").eq("id", "default").maybeSingle();
  return {
    produto: data?.produto ?? "Site institucional profissional",
    preco: data?.preco ?? 1497,
    formas_pagamento: data?.formas_pagamento ?? "PIX ou cartão de crédito, em até 12x",
    prazo_entrega: data?.prazo_entrega ?? "10 dias úteis após aprovação do conteúdo",
    incluso: data?.incluso ?? "Design profissional, até 5 páginas, formulário de contato, otimização para celular",
    nao_incluso: data?.nao_incluso ?? "Fotos profissionais, redação de texto, domínio e hospedagem",
    desconto_maximo_automatico_pct: data?.desconto_maximo_automatico_pct ?? 0,
    parcelamento_maximo: data?.parcelamento_maximo ?? 12,
  };
}

/**
 * Circuit breaker por taxa de opt-out (Fase 5) — chamado 1x por dia
 * pelo cron. Se muita gente estiver pedindo pra não ser mais
 * contatada num período curto, é sinal de abordagem errada (ou até
 * abuso) — pausa a Iara pra reavaliação humana antes de continuar
 * incomodando mais gente.
 */
export async function verificarTaxaOptOutProstec(): Promise<{ pausou: boolean }> {
  const supabase = await createClient();
  const ultimas24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [{ count: totalConversas }, { count: optOutsRecentes }, { data: config }] = await Promise.all([
    supabase.from("prostec_conversas").select("*", { count: "exact", head: true }).gte("ultima_mensagem_em", ultimas24h),
    supabase.from("prostec_opt_out").select("*", { count: "exact", head: true }).gte("created_at", ultimas24h),
    supabase.from("integracoes_whatsapp_prostec").select("id, limite_opt_out_pct, iara_ativa").maybeSingle(),
  ]);

  if (!config || !config.iara_ativa || (totalConversas ?? 0) < 5) return { pausou: false }; // amostra pequena demais pra significar algo

  const taxaOptOut = ((optOutsRecentes ?? 0) / (totalConversas ?? 1)) * 100;
  if (taxaOptOut <= config.limite_opt_out_pct) return { pausou: false };

  await supabase.from("integracoes_whatsapp_prostec").update({
    iara_ativa: false, pausado_automaticamente: true,
    motivo_pausa_automatica: `Taxa de opt-out de ${taxaOptOut.toFixed(1)}% nas últimas 24h, acima do limite (${config.limite_opt_out_pct}%) — pausada automaticamente.`,
  }).eq("id", config.id);

  await supabase.from("prostec_anomalias").insert({
    tipo: "taxa_opt_out", descricao: "Sistema pausado automaticamente por taxa alta de opt-out",
    valor_observado: taxaOptOut, limite_configurado: config.limite_opt_out_pct, pausou_sistema: true,
  });

  return { pausou: true };
}

/**
 * Next Best Action (Fase 6) — motor DETERMINÍSTICO, separado da
 * decisão em texto livre da própria IA numa conversa. Roda pra TODO
 * lead (mesmo os que nunca conversaram com a Iara ainda), baseado só
 * em regra de código, nunca em IA — pra sempre ser previsível e
 * auditável.
 */
function calcularNextBestAction(lead: {
  status: string; temperature: string; score: number; created_at: string; proximo_followup_em: string | null;
}): { acao: string; motivo: string } {
  const diasDesdeCriacao = Math.floor((Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24));

  if (lead.status === "venda_fechada" || lead.status === "perdido") return { acao: "Não entrar em contato", motivo: `Lead já está em status final (${lead.status})` };
  if (lead.status === "novo" && lead.temperature === "quente") return { acao: "Enviar primeira abordagem", motivo: "Lead quente ainda não contatado — prioridade alta" };
  if (lead.status === "novo") return { acao: "Enviar primeira abordagem", motivo: "Lead ainda não contatado" };
  if (lead.status === "contato_realizado" && diasDesdeCriacao >= 2) return { acao: "Fazer follow-up", motivo: "Contatado há 2+ dias sem avançar de etapa" };
  if (lead.status === "contato_realizado") return { acao: "Aguardar resposta", motivo: "Contato recente, ainda dentro da janela normal de resposta" };
  if (lead.status === "qualificado") return { acao: "Chamar vendedor", motivo: "Lead qualificado precisa de atendimento humano pra avançar" };
  if (lead.status === "reuniao") return { acao: "Aguardar resposta", motivo: "Reunião em andamento" };
  if (lead.status === "proposta_enviada" && lead.proximo_followup_em && new Date(lead.proximo_followup_em) <= new Date()) return { acao: "Fazer follow-up", motivo: "Follow-up de proposta está vencido" };
  if (lead.status === "proposta_enviada") return { acao: "Aguardar resposta", motivo: "Proposta enviada, dentro do prazo de follow-up automático" };
  if (lead.status === "negociacao") return { acao: "Tratar objeção", motivo: "Lead em negociação ativa" };

  return { acao: "Aguardar resposta", motivo: "Sem regra específica pra esse estágio — padrão seguro" };
}

/** Recalcula o Next Best Action de todo lead ativo — chamado 1x por dia pelo cron. */
export async function recalcularNextBestActionTodosLeads(): Promise<{ atualizados: number }> {
  const supabase = await createClient();
  const { data: leads } = await supabase.from("prostec_leads").select("id, status, temperature, score, created_at, proximo_followup_em").not("status", "in", "(venda_fechada,perdido)");

  let atualizados = 0;
  for (const lead of leads ?? []) {
    const { acao, motivo } = calcularNextBestAction(lead);
    await supabase.from("prostec_leads").update({ next_best_action: acao, next_best_action_motivo: motivo, next_best_action_calculada_em: new Date().toISOString() }).eq("id", lead.id);
    atualizados++;
  }
  return { atualizados };
}

export interface DecisaoIaraLog {
  id: string;
  mensagem_recebida: string;
  intent: string | null;
  decisao: string | null;
  acao: string | null;
  tokens_entrada: number | null;
  tokens_saida: number | null;
  custo_estimado: number | null;
  desconto_solicitado_pct: number | null;
  desconto_validado: boolean | null;
  created_at: string;
  lead_empresa_nome: string | null;
}

/** Log de decisões da Iara (Fase 2) — o dado já existia desde a Fase 203, essa é a primeira vez que vira visível numa tela. */
export async function listarDecisoesIara(limite = 50): Promise<DecisaoIaraLog[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("prostec_ia_decisoes")
    .select("id, mensagem_recebida, intent, decisao, acao, tokens_entrada, tokens_saida, custo_estimado, desconto_solicitado_pct, desconto_validado, created_at, conversa:prostec_conversas(lead:prostec_leads(company:prostec_companies(name)))")
    .order("created_at", { ascending: false })
    .limit(limite);

  return (data ?? []).map((d) => {
    const conversa = d.conversa as unknown as { lead: { company: { name: string } | null } | null } | null;
    return { ...d, lead_empresa_nome: conversa?.lead?.company?.name ?? null };
  });
}

export interface MetricasComerciaisProstec {
  taxaResposta: number;
  taxaInteresse: number;
  taxaConversao: number;
  ticketMedio: number;
  receitaTotal: number;
  custoIaTotal: number;
  custoPorLead: number;
  decisoesTotal: number;
  escaladasParaHumano: number;
}

/** Métricas comerciais completas (Fase 2, pedido explícito da seção 18 do documento). */
export async function obterMetricasComerciaisProstec(): Promise<MetricasComerciaisProstec> {
  const supabase = await createClient();
  const trintaDiasAtras = new Date();
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

  const [{ count: totalLeads }, { count: totalConversas }, { count: totalQualificados }, { count: totalVendas }, { data: vendas }, { data: decisoes }, { count: escaladas }] = await Promise.all([
    supabase.from("prostec_leads").select("*", { count: "exact", head: true }).gte("created_at", trintaDiasAtras.toISOString()),
    supabase.from("prostec_conversas").select("*", { count: "exact", head: true }).gte("created_at", trintaDiasAtras.toISOString()),
    supabase.from("prostec_leads").select("*", { count: "exact", head: true }).in("status", ["qualificado", "reuniao", "proposta_enviada", "negociacao", "venda_fechada"]).gte("created_at", trintaDiasAtras.toISOString()),
    supabase.from("prostec_leads").select("*", { count: "exact", head: true }).eq("status", "venda_fechada").gte("created_at", trintaDiasAtras.toISOString()),
    supabase.from("prostec_sales").select("amount").gte("closed_at", trintaDiasAtras.toISOString()),
    supabase.from("prostec_ia_decisoes").select("custo_estimado").gte("created_at", trintaDiasAtras.toISOString()),
    supabase.from("prostec_conversas").select("*", { count: "exact", head: true }).eq("exige_atencao", true).gte("created_at", trintaDiasAtras.toISOString()),
  ]);

  const receitaTotal = (vendas ?? []).reduce((acc, v) => acc + Number(v.amount), 0);
  const custoIaTotal = (decisoes ?? []).reduce((acc, d) => acc + Number(d.custo_estimado ?? 0), 0);

  return {
    taxaResposta: (totalConversas ?? 0) > 0 ? Math.round(((totalConversas ?? 0) / Math.max(totalLeads ?? 1, 1)) * 1000) / 10 : 0,
    taxaInteresse: (totalLeads ?? 0) > 0 ? Math.round(((totalQualificados ?? 0) / (totalLeads ?? 1)) * 1000) / 10 : 0,
    taxaConversao: (totalLeads ?? 0) > 0 ? Math.round(((totalVendas ?? 0) / (totalLeads ?? 1)) * 1000) / 10 : 0,
    ticketMedio: (totalVendas ?? 0) > 0 ? receitaTotal / (totalVendas ?? 1) : 0,
    receitaTotal,
    custoIaTotal,
    custoPorLead: (totalLeads ?? 0) > 0 ? custoIaTotal / (totalLeads ?? 1) : 0,
    decisoesTotal: (decisoes ?? []).length,
    escaladasParaHumano: escaladas ?? 0,
  };
}

export interface ExperimentoProstec {
  id: string;
  nome: string;
  descricao: string | null;
  status: string;
  amostra_minima: number;
  variante_vencedora: string | null;
  created_at: string;
  variantes: { id: string; nome: string; texto_mensagem: string; enviadas: number; respondidas: number; interessadas: number; vendidas: number }[];
}

export async function listarExperimentosProstec(): Promise<ExperimentoProstec[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("prostec_experimentos").select("*, variantes:prostec_experimento_variantes(*)").order("created_at", { ascending: false });
  return data ?? [];
}

export interface VendedorProstec {
  id: string;
  nome: string;
}

export async function listarVendedoresProstec(): Promise<VendedorProstec[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("usuarios").select("id, nome").eq("cargo", "vendedor_prostec").order("nome");
  return data ?? [];
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

export interface ConversaProstec {
  id: string;
  telefone: string;
  status: string;
  propriedade: string;
  nao_lidas: number;
  ultima_mensagem_em: string | null;
  lead_empresa_nome: string | null;
  lead_id: string | null;
  exige_atencao: boolean;
  motivo_atencao: string | null;
  ultima_intencao: string | null;
  proxima_acao: string | null;
}

const CAMPOS_CONVERSA = "id, telefone, status, propriedade, nao_lidas, ultima_mensagem_em, lead_id, exige_atencao, motivo_atencao, ultima_intencao, proxima_acao, lead:prostec_leads(company:prostec_companies(name))";

function mapearConversa(c: Record<string, unknown>): ConversaProstec {
  const lead = c.lead as unknown as { company: { name: string } | null } | null;
  return {
    id: c.id as string, telefone: c.telefone as string, status: c.status as string, propriedade: c.propriedade as string,
    nao_lidas: c.nao_lidas as number, ultima_mensagem_em: c.ultima_mensagem_em as string | null, lead_id: c.lead_id as string | null,
    exige_atencao: c.exige_atencao as boolean, motivo_atencao: c.motivo_atencao as string | null,
    ultima_intencao: c.ultima_intencao as string | null, proxima_acao: c.proxima_acao as string | null,
    lead_empresa_nome: lead?.company?.name ?? null,
  };
}

export async function listarConversasProstec(): Promise<ConversaProstec[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("prostec_conversas").select(CAMPOS_CONVERSA).order("ultima_mensagem_em", { ascending: false, nullsFirst: false });
  return (data ?? []).map(mapearConversa);
}

export interface MensagemProstec {
  id: string;
  remetente: string;
  conteudo: string;
  ia_gerada: boolean;
  enviada_em: string;
}

export async function buscarConversaComMensagens(conversaId: string): Promise<{ conversa: ConversaProstec; mensagens: MensagemProstec[] } | null> {
  const supabase = await createClient();
  const [{ data: conversa }, { data: mensagens }] = await Promise.all([
    supabase.from("prostec_conversas").select(CAMPOS_CONVERSA).eq("id", conversaId).maybeSingle(),
    supabase.from("prostec_mensagens").select("id, remetente, conteudo, ia_gerada, enviada_em").eq("conversa_id", conversaId).order("enviada_em"),
  ]);
  if (!conversa) return null;

  return { conversa: mapearConversa(conversa), mensagens: mensagens ?? [] };
}

export interface ConfigWhatsappProstec {
  numero: string | null;
  status: string;
  qr_code: string | null;
  ultima_conexao: string | null;
  modo_operacao: string;
  iara_ativa: boolean;
  mensagens_hoje: number;
  pausado_automaticamente: boolean;
  motivo_pausa_automatica: string | null;
}

export async function buscarConfigWhatsappProstec(): Promise<ConfigWhatsappProstec | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("integracoes_whatsapp_prostec").select("numero, status, qr_code, ultima_conexao, modo_operacao, iara_ativa, mensagens_hoje, pausado_automaticamente, motivo_pausa_automatica").maybeSingle();
  return data ?? null;
}
