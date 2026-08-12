import { createClient } from "@/lib/supabase/server";

export interface MetricaPeriodo {
  hoje: number;
  semana: number;
  mes: number;
  variacaoHoje: number | null;
  variacaoMes: number | null;
}

export interface ResumoLojaAnalytics {
  onlineAgora: number;
  visitantes: MetricaPeriodo;
  visualizacoes: MetricaPeriodo;
  carrinhos: MetricaPeriodo;
  vendas: MetricaPeriodo;
  faturamento: MetricaPeriodo;
}

export interface AtividadeRecente {
  id: string;
  tipo: "pageview" | "add_to_cart" | "venda";
  descricao: string;
  quando: string;
}

export interface ProdutoDestaque {
  nome: string;
  visualizacoes: number;
  carrinhos: number;
  vendas: number;
}

export interface OrigemAcesso {
  origem: string;
  label: string;
  percentual: number;
  quantidade: number;
}

export interface PontoGrafico {
  rotulo: string;
  valor: number;
}

function inicioDoDia(data: Date): Date {
  const d = new Date(data);
  d.setHours(0, 0, 0, 0);
  return d;
}

function variacaoPercentual(atual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return Math.round(((atual - anterior) / anterior) * 1000) / 10;
}

/** Só o essencial pro polling de "online agora" — evita rodar o resumo completo (20 consultas) a cada 15s. */
export async function obterOnlineAgora(): Promise<number> {
  const supabase = await createClient();
  const doisMinAtras = new Date(Date.now() - 2 * 60 * 1000);
  const { count } = await supabase.from("loja_sessoes").select("*", { count: "exact", head: true }).gte("ultima_atividade_em", doisMinAtras.toISOString());
  return count ?? 0;
}

/** Resumo principal — cards do topo. */
export async function obterResumoLojaAnalytics(): Promise<ResumoLojaAnalytics> {
  const supabase = await createClient();

  const agora = new Date();
  const hojeInicio = inicioDoDia(agora);
  const ontemInicio = new Date(hojeInicio);
  ontemInicio.setDate(ontemInicio.getDate() - 1);
  const semanaInicio = new Date(hojeInicio);
  semanaInicio.setDate(semanaInicio.getDate() - 7);
  const mesInicio = new Date(hojeInicio);
  mesInicio.setMonth(mesInicio.getMonth() - 1);
  const mesAnteriorInicio = new Date(mesInicio);
  mesAnteriorInicio.setMonth(mesAnteriorInicio.getMonth() - 1);
  const doisMinAtras = new Date(agora.getTime() - 2 * 60 * 1000);

  const [
    { count: onlineAgora },
    { count: visitantesHoje }, { count: visitantesOntem }, { count: visitantesSemana }, { count: visitantesMes }, { count: visitantesMesAnterior },
    { count: viewsHoje }, { count: viewsOntem }, { count: viewsSemana }, { count: viewsMes }, { count: viewsMesAnterior },
    { count: carrinhosHoje }, { count: carrinhosOntem }, { count: carrinhosSemana }, { count: carrinhosMes }, { count: carrinhosMesAnterior },
    { data: vendasHojeData }, { data: vendasOntemData }, { data: vendasSemanaData }, { data: vendasMesData }, { data: vendasMesAnteriorData },
  ] = await Promise.all([
    supabase.from("loja_sessoes").select("*", { count: "exact", head: true }).gte("ultima_atividade_em", doisMinAtras.toISOString()),

    supabase.from("loja_sessoes").select("*", { count: "exact", head: true }).gte("criado_em", hojeInicio.toISOString()),
    supabase.from("loja_sessoes").select("*", { count: "exact", head: true }).gte("criado_em", ontemInicio.toISOString()).lt("criado_em", hojeInicio.toISOString()),
    supabase.from("loja_sessoes").select("*", { count: "exact", head: true }).gte("criado_em", semanaInicio.toISOString()),
    supabase.from("loja_sessoes").select("*", { count: "exact", head: true }).gte("criado_em", mesInicio.toISOString()),
    supabase.from("loja_sessoes").select("*", { count: "exact", head: true }).gte("criado_em", mesAnteriorInicio.toISOString()).lt("criado_em", mesInicio.toISOString()),

    supabase.from("loja_eventos").select("*", { count: "exact", head: true }).eq("tipo", "pageview").gte("criado_em", hojeInicio.toISOString()),
    supabase.from("loja_eventos").select("*", { count: "exact", head: true }).eq("tipo", "pageview").gte("criado_em", ontemInicio.toISOString()).lt("criado_em", hojeInicio.toISOString()),
    supabase.from("loja_eventos").select("*", { count: "exact", head: true }).eq("tipo", "pageview").gte("criado_em", semanaInicio.toISOString()),
    supabase.from("loja_eventos").select("*", { count: "exact", head: true }).eq("tipo", "pageview").gte("criado_em", mesInicio.toISOString()),
    supabase.from("loja_eventos").select("*", { count: "exact", head: true }).eq("tipo", "pageview").gte("criado_em", mesAnteriorInicio.toISOString()).lt("criado_em", mesInicio.toISOString()),

    supabase.from("loja_eventos").select("*", { count: "exact", head: true }).eq("tipo", "add_to_cart").gte("criado_em", hojeInicio.toISOString()),
    supabase.from("loja_eventos").select("*", { count: "exact", head: true }).eq("tipo", "add_to_cart").gte("criado_em", ontemInicio.toISOString()).lt("criado_em", hojeInicio.toISOString()),
    supabase.from("loja_eventos").select("*", { count: "exact", head: true }).eq("tipo", "add_to_cart").gte("criado_em", semanaInicio.toISOString()),
    supabase.from("loja_eventos").select("*", { count: "exact", head: true }).eq("tipo", "add_to_cart").gte("criado_em", mesInicio.toISOString()),
    supabase.from("loja_eventos").select("*", { count: "exact", head: true }).eq("tipo", "add_to_cart").gte("criado_em", mesAnteriorInicio.toISOString()).lt("criado_em", mesInicio.toISOString()),

    supabase.from("vw_vendas_seguro").select("valor_total").gte("data_venda", hojeInicio.toISOString()),
    supabase.from("vw_vendas_seguro").select("valor_total").gte("data_venda", ontemInicio.toISOString()).lt("data_venda", hojeInicio.toISOString()),
    supabase.from("vw_vendas_seguro").select("valor_total").gte("data_venda", semanaInicio.toISOString()),
    supabase.from("vw_vendas_seguro").select("valor_total").gte("data_venda", mesInicio.toISOString()),
    supabase.from("vw_vendas_seguro").select("valor_total").gte("data_venda", mesAnteriorInicio.toISOString()).lt("data_venda", mesInicio.toISOString()),
  ]);

  const somar = (rows: { valor_total: number }[] | null) => (rows ?? []).reduce((acc, v) => acc + Number(v.valor_total ?? 0), 0);
  const contar = (rows: { valor_total: number }[] | null) => (rows ?? []).length;

  const faturamentoHoje = somar(vendasHojeData);
  const faturamentoOntem = somar(vendasOntemData);
  const faturamentoMes = somar(vendasMesData);
  const faturamentoMesAnterior = somar(vendasMesAnteriorData);

  return {
    onlineAgora: onlineAgora ?? 0,
    visitantes: {
      hoje: visitantesHoje ?? 0, semana: visitantesSemana ?? 0, mes: visitantesMes ?? 0,
      variacaoHoje: variacaoPercentual(visitantesHoje ?? 0, visitantesOntem ?? 0),
      variacaoMes: variacaoPercentual(visitantesMes ?? 0, visitantesMesAnterior ?? 0),
    },
    visualizacoes: {
      hoje: viewsHoje ?? 0, semana: viewsSemana ?? 0, mes: viewsMes ?? 0,
      variacaoHoje: variacaoPercentual(viewsHoje ?? 0, viewsOntem ?? 0),
      variacaoMes: variacaoPercentual(viewsMes ?? 0, viewsMesAnterior ?? 0),
    },
    carrinhos: {
      hoje: carrinhosHoje ?? 0, semana: carrinhosSemana ?? 0, mes: carrinhosMes ?? 0,
      variacaoHoje: variacaoPercentual(carrinhosHoje ?? 0, carrinhosOntem ?? 0),
      variacaoMes: variacaoPercentual(carrinhosMes ?? 0, carrinhosMesAnterior ?? 0),
    },
    vendas: {
      hoje: contar(vendasHojeData), semana: contar(vendasSemanaData), mes: contar(vendasMesData),
      variacaoHoje: variacaoPercentual(contar(vendasHojeData), contar(vendasOntemData)),
      variacaoMes: variacaoPercentual(contar(vendasMesData), contar(vendasMesAnteriorData)),
    },
    faturamento: {
      hoje: faturamentoHoje, semana: somar(vendasSemanaData), mes: faturamentoMes,
      variacaoHoje: variacaoPercentual(faturamentoHoje, faturamentoOntem),
      variacaoMes: variacaoPercentual(faturamentoMes, faturamentoMesAnterior),
    },
  };
}

/** Últimas atividades — pageview de produto, add_to_cart, venda. Sem identidade de visitante anônimo (pedido explícito). */
export async function obterAtividadeRecente(limite = 15): Promise<AtividadeRecente[]> {
  const supabase = await createClient();

  const [{ data: eventos }, { data: vendasRecentes }] = await Promise.all([
    supabase
      .from("loja_eventos")
      .select("id, tipo, pagina, criado_em, produto:produtos(nome), aparelho:aparelhos(produto:produtos(nome))")
      .in("tipo", ["pageview", "add_to_cart"])
      .not("produto_id", "is", null)
      .order("criado_em", { ascending: false })
      .limit(limite),
    supabase.from("vw_vendas_seguro").select("id, valor_total, data_venda").order("data_venda", { ascending: false }).limit(5),
  ]);

  const itensEventos: AtividadeRecente[] = (eventos ?? []).map((e) => {
    const produto = e.produto as unknown as { nome: string } | null;
    const aparelho = e.aparelho as unknown as { produto: { nome: string } | null } | null;
    const nome = produto?.nome ?? aparelho?.produto?.nome ?? "um produto";
    return {
      id: e.id,
      tipo: e.tipo as "pageview" | "add_to_cart",
      descricao: e.tipo === "pageview" ? `👀 Visualizou ${nome}` : `🛒 Adicionou ${nome} ao carrinho`,
      quando: e.criado_em,
    };
  });

  const itensVendas: AtividadeRecente[] = (vendasRecentes ?? []).map((v) => ({
    id: v.id, tipo: "venda" as const, descricao: "💰 Venda realizada", quando: v.data_venda,
  }));

  return [...itensEventos, ...itensVendas].sort((a, b) => b.quando.localeCompare(a.quando)).slice(0, limite);
}

/** Produtos mais acessados — views, carrinhos e vendas por produto, ordenado por visualização. */
export async function obterProdutosDestaque(limite = 10): Promise<ProdutoDestaque[]> {
  const supabase = await createClient();
  const trintaDiasAtras = new Date();
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

  const { data: eventos } = await supabase
    .from("loja_eventos")
    .select("tipo, produto_id, produto:produtos(nome)")
    .not("produto_id", "is", null)
    .gte("criado_em", trintaDiasAtras.toISOString());

  const { data: itensVendidosBrutos } = await supabase
    .from("venda_itens")
    .select("produto_id, quantidade, venda:vendas!inner(data_venda)")
    .not("produto_id", "is", null);

  // Filtra os últimos 30 dias em memória — evita depender de filtro
  // aninhado ("venda.data_venda") no PostgREST, que não é um padrão
  // usado em nenhum outro lugar do projeto e pode se comportar de
  // forma inesperada. venda_itens não é uma tabela gigante, filtrar
  // aqui é seguro e simples de entender.
  const itensVendidos = (itensVendidosBrutos ?? []).filter((item) => {
    const venda = item.venda as unknown as { data_venda: string } | null;
    return venda && new Date(venda.data_venda) >= trintaDiasAtras;
  });

  const mapa = new Map<string, ProdutoDestaque>();

  for (const e of eventos ?? []) {
    const produto = e.produto as unknown as { nome: string } | null;
    if (!e.produto_id || !produto) continue;
    const atual = mapa.get(e.produto_id) ?? { nome: produto.nome, visualizacoes: 0, carrinhos: 0, vendas: 0 };
    if (e.tipo === "pageview") atual.visualizacoes++;
    else if (e.tipo === "add_to_cart") atual.carrinhos++;
    mapa.set(e.produto_id, atual);
  }

  for (const v of itensVendidos ?? []) {
    if (!v.produto_id) continue;
    const atual = mapa.get(v.produto_id);
    if (atual) atual.vendas += v.quantidade;
  }

  return Array.from(mapa.values()).sort((a, b) => b.visualizacoes - a.visualizacoes).slice(0, limite);
}

const LABEL_ORIGEM: Record<string, string> = {
  instagram: "Instagram", google: "Google", whatsapp: "WhatsApp",
  meta_ads: "Meta Ads", direto: "Acesso direto", outros: "Outros",
};

/** De onde os visitantes vieram — só primeira visita de cada sessão nos últimos 30 dias. */
export async function obterOrigemAcessos(): Promise<OrigemAcesso[]> {
  const supabase = await createClient();
  const trintaDiasAtras = new Date();
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

  const { data } = await supabase.from("loja_sessoes").select("origem").gte("criado_em", trintaDiasAtras.toISOString());
  const total = data?.length ?? 0;
  if (total === 0) return [];

  const contagem = new Map<string, number>();
  for (const s of data ?? []) {
    const chave = s.origem ?? "direto";
    contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
  }

  return Array.from(contagem.entries())
    .map(([origem, quantidade]) => ({
      origem, label: LABEL_ORIGEM[origem] ?? "Outros",
      quantidade, percentual: Math.round((quantidade / total) * 1000) / 10,
    }))
    .sort((a, b) => b.quantidade - a.quantidade);
}

/** Gráfico de visitantes — hoje (por hora) ou 7/30 dias (por dia). */
export async function obterGraficoVisitantes(periodo: "hoje" | "7dias" | "30dias"): Promise<PontoGrafico[]> {
  const supabase = await createClient();
  const agora = new Date();

  if (periodo === "hoje") {
    const hojeInicio = inicioDoDia(agora);
    const { data } = await supabase.from("loja_sessoes").select("criado_em").gte("criado_em", hojeInicio.toISOString());

    const porHora = new Array(24).fill(0);
    for (const s of data ?? []) porHora[new Date(s.criado_em).getHours()]++;

    return porHora.map((valor, hora) => ({ rotulo: `${String(hora).padStart(2, "0")}h`, valor }));
  }

  const dias = periodo === "7dias" ? 7 : 30;
  const inicio = new Date(inicioDoDia(agora));
  inicio.setDate(inicio.getDate() - (dias - 1));

  const { data } = await supabase.from("loja_sessoes").select("criado_em").gte("criado_em", inicio.toISOString());

  const porDia = new Map<string, number>();
  for (let i = 0; i < dias; i++) {
    const d = new Date(inicio);
    d.setDate(d.getDate() + i);
    porDia.set(d.toISOString().slice(0, 10), 0);
  }
  for (const s of data ?? []) {
    const chave = s.criado_em.slice(0, 10);
    porDia.set(chave, (porDia.get(chave) ?? 0) + 1);
  }

  return Array.from(porDia.entries()).map(([data, valor]) => {
    const [, mes, dia] = data.split("-");
    return { rotulo: `${dia}/${mes}`, valor };
  });
}
