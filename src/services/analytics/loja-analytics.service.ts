import { createClient } from "@/lib/supabase/server";
import { inicioDoDiaBrasilia, horaBrasilia, obterDataHoraBrasilia } from "@/utils/data-brasilia";

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

/**
 * Resumo principal — cards do topo.
 *
 * Fase 254: antes disparava ~20 queries separadas (uma contagem por
 * janela de tempo x métrica). Agora busca cada tabela UMA vez, só com o
 * filtro `gte(desde a janela mais larga)`, e conta/soma tudo em memória
 * por janela — cai pra 4 queries no total (sessões, eventos, vendas,
 * online-agora), sem mudar nenhum número reportado. Os limites de cada
 * janela agora usam o fuso de Brasília (fixo UTC-3, sem horário de
 * verão desde 2019), não mais o horário local do servidor — corrige o
 * deslocamento de até 3h que existia quando o servidor roda em UTC.
 */
export async function obterResumoLojaAnalytics(): Promise<ResumoLojaAnalytics> {
  const supabase = await createClient();

  const agora = new Date();
  const hojeInicio = inicioDoDiaBrasilia(agora);
  const ontemInicio = new Date(hojeInicio);
  ontemInicio.setUTCDate(ontemInicio.getUTCDate() - 1);
  const semanaInicio = new Date(hojeInicio);
  semanaInicio.setUTCDate(semanaInicio.getUTCDate() - 7);
  const mesInicio = new Date(hojeInicio);
  mesInicio.setUTCMonth(mesInicio.getUTCMonth() - 1);
  const mesAnteriorInicio = new Date(mesInicio);
  mesAnteriorInicio.setUTCMonth(mesAnteriorInicio.getUTCMonth() - 1);
  const doisMinAtras = new Date(agora.getTime() - 2 * 60 * 1000);
  const janelaMaisLarga = mesAnteriorInicio;

  const [
    { count: onlineAgora },
    { data: sessoes },
    { data: eventos },
    { data: pedidos },
  ] = await Promise.all([
    supabase.from("loja_sessoes").select("*", { count: "exact", head: true }).gte("ultima_atividade_em", doisMinAtras.toISOString()),
    supabase.from("loja_sessoes").select("criado_em").gte("criado_em", janelaMaisLarga.toISOString()),
    supabase.from("loja_eventos").select("tipo, criado_em").gte("criado_em", janelaMaisLarga.toISOString()),
    // Vendas/faturamento usa `pedidos_loja` (não `vendas`) — `vendas`
    // mistura PDV presencial com checkout online sem nenhuma forma de
    // diferenciar (checkout online cria a venda sem guardar referência
    // de volta pro pedido). `pedidos_loja` é especificamente do site,
    // então é a fonte certa pro Analytics da Loja.
    supabase.from("pedidos_loja").select("valor_total, updated_at").eq("status", "concluido").gte("updated_at", janelaMaisLarga.toISOString()),
  ]);

  const contarNaJanela = (linhas: { criado_em: string }[] | null, desde: Date, ate?: Date) =>
    (linhas ?? []).filter((l) => l.criado_em >= desde.toISOString() && (!ate || l.criado_em < ate.toISOString())).length;

  const eventosPorTipo = (tipo: string) => (eventos ?? []).filter((e) => e.tipo === tipo);

  const pedidosNaJanela = (desde: Date, ate?: Date) =>
    (pedidos ?? []).filter((p) => p.updated_at >= desde.toISOString() && (!ate || p.updated_at < ate.toISOString()));
  const somar = (linhas: { valor_total: number }[]) => linhas.reduce((acc, v) => acc + Number(v.valor_total ?? 0), 0);

  const visitantesHoje = contarNaJanela(sessoes, hojeInicio);
  const visitantesOntem = contarNaJanela(sessoes, ontemInicio, hojeInicio);
  const visitantesSemana = contarNaJanela(sessoes, semanaInicio);
  const visitantesMes = contarNaJanela(sessoes, mesInicio);
  const visitantesMesAnterior = contarNaJanela(sessoes, mesAnteriorInicio, mesInicio);

  const pageviews = eventosPorTipo("pageview");
  const viewsHoje = contarNaJanela(pageviews, hojeInicio);
  const viewsOntem = contarNaJanela(pageviews, ontemInicio, hojeInicio);
  const viewsSemana = contarNaJanela(pageviews, semanaInicio);
  const viewsMes = contarNaJanela(pageviews, mesInicio);
  const viewsMesAnterior = contarNaJanela(pageviews, mesAnteriorInicio, mesInicio);

  const addToCart = eventosPorTipo("add_to_cart");
  const carrinhosHoje = contarNaJanela(addToCart, hojeInicio);
  const carrinhosOntem = contarNaJanela(addToCart, ontemInicio, hojeInicio);
  const carrinhosSemana = contarNaJanela(addToCart, semanaInicio);
  const carrinhosMes = contarNaJanela(addToCart, mesInicio);
  const carrinhosMesAnterior = contarNaJanela(addToCart, mesAnteriorInicio, mesInicio);

  const vendasHoje = pedidosNaJanela(hojeInicio);
  const vendasOntem = pedidosNaJanela(ontemInicio, hojeInicio);
  const vendasSemana = pedidosNaJanela(semanaInicio);
  const vendasMes = pedidosNaJanela(mesInicio);
  const vendasMesAnterior = pedidosNaJanela(mesAnteriorInicio, mesInicio);

  const faturamentoHoje = somar(vendasHoje);
  const faturamentoOntem = somar(vendasOntem);
  const faturamentoMes = somar(vendasMes);
  const faturamentoMesAnterior = somar(vendasMesAnterior);

  return {
    onlineAgora: onlineAgora ?? 0,
    visitantes: {
      hoje: visitantesHoje, semana: visitantesSemana, mes: visitantesMes,
      variacaoHoje: variacaoPercentual(visitantesHoje, visitantesOntem),
      variacaoMes: variacaoPercentual(visitantesMes, visitantesMesAnterior),
    },
    visualizacoes: {
      hoje: viewsHoje, semana: viewsSemana, mes: viewsMes,
      variacaoHoje: variacaoPercentual(viewsHoje, viewsOntem),
      variacaoMes: variacaoPercentual(viewsMes, viewsMesAnterior),
    },
    carrinhos: {
      hoje: carrinhosHoje, semana: carrinhosSemana, mes: carrinhosMes,
      variacaoHoje: variacaoPercentual(carrinhosHoje, carrinhosOntem),
      variacaoMes: variacaoPercentual(carrinhosMes, carrinhosMesAnterior),
    },
    vendas: {
      hoje: vendasHoje.length, semana: vendasSemana.length, mes: vendasMes.length,
      variacaoHoje: variacaoPercentual(vendasHoje.length, vendasOntem.length),
      variacaoMes: variacaoPercentual(vendasMes.length, vendasMesAnterior.length),
    },
    faturamento: {
      hoje: faturamentoHoje, semana: somar(vendasSemana), mes: faturamentoMes,
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
    supabase.from("pedidos_loja").select("id, valor_total, updated_at").eq("status", "concluido").order("updated_at", { ascending: false }).limit(5),
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
    id: v.id, tipo: "venda" as const, descricao: "💰 Venda realizada", quando: v.updated_at,
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

  // "Vendas" aqui usa pedido_loja_itens (só site) filtrado pelo pedido
  // estar concluído — não venda_itens (que mistura PDV com site, mesmo
  // problema já corrigido no resumo principal acima).
  const { data: pedidosConcluidos } = await supabase.from("pedidos_loja").select("id").eq("status", "concluido").gte("updated_at", trintaDiasAtras.toISOString());
  const idsPedidosConcluidos = (pedidosConcluidos ?? []).map((p) => p.id);

  const { data: itensVendidos } = idsPedidosConcluidos.length > 0
    ? await supabase.from("pedido_loja_itens").select("produto_id, quantidade").not("produto_id", "is", null).in("pedido_id", idsPedidosConcluidos)
    : { data: [] };

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
    const hojeInicio = inicioDoDiaBrasilia(agora);
    const { data } = await supabase.from("loja_sessoes").select("criado_em").gte("criado_em", hojeInicio.toISOString());

    const porHora = new Array(24).fill(0);
    for (const s of data ?? []) porHora[horaBrasilia(new Date(s.criado_em))]++;

    return porHora.map((valor, hora) => ({ rotulo: `${String(hora).padStart(2, "0")}h`, valor }));
  }

  const dias = periodo === "7dias" ? 7 : 30;
  const inicio = new Date(inicioDoDiaBrasilia(agora));
  inicio.setUTCDate(inicio.getUTCDate() - (dias - 1));

  const { data } = await supabase.from("loja_sessoes").select("criado_em").gte("criado_em", inicio.toISOString());

  const porDia = new Map<string, number>();
  for (let i = 0; i < dias; i++) {
    const d = new Date(inicio);
    d.setDate(d.getDate() + i);
    porDia.set(d.toISOString().slice(0, 10), 0);
  }
  for (const s of data ?? []) {
    // Chave do dia sempre no fuso de Brasília — usar o prefixo cru do
    // timestamp (UTC) botava evento perto da meia-noite no dia errado.
    const { ano, mes, dia } = obterDataHoraBrasilia(new Date(s.criado_em));
    const chave = `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    if (porDia.has(chave)) porDia.set(chave, (porDia.get(chave) ?? 0) + 1);
  }

  return Array.from(porDia.entries()).map(([data, valor]) => {
    const [, mes, dia] = data.split("-");
    return { rotulo: `${dia}/${mes}`, valor };
  });
}
