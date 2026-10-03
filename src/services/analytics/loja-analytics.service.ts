import { createClient } from "@/lib/supabase/server";
import { inicioDoDiaBrasilia, horaBrasilia, obterDataHoraBrasilia } from "@/utils/data-brasilia";

export interface MetricaPeriodo {
  hoje: number;
  semana: number;
  mes: number;
  variacaoHoje: number | null;
  variacaoMes: number | null;
}

export interface FunilCheckout {
  visualizacoes: number;
  carrinhos: number;
  checkoutIniciado: number;
  pagamentoAprovado: number;
}

export interface ResumoLojaAnalytics {
  onlineAgora: number;
  visitantes: MetricaPeriodo;
  visualizacoes: MetricaPeriodo;
  carrinhos: MetricaPeriodo;
  vendas: MetricaPeriodo;
  faturamento: MetricaPeriodo;
  /**
   * Fase 255: os eventos de checkout (checkout_view/started/
   * payment_selected/payment_success/payment_failed, Fase 197) eram
   * gravados no banco e nunca lidos por nenhum service — o funil que
   * a tela mostrava pulava direto de "carrinho" pra "venda". Isso
   * expõe as duas etapas que já existiam e não apareciam em lugar
   * nenhum.
   */
  funilCheckout: FunilCheckout;
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

export interface CampanhaMarketing {
  campanha: string;
  origem: string;
  pedidos: number;
  receita: number;
  leads: number;
}

export interface ResumoMarketing {
  /** Sessões dos últimos 30 dias que chegaram com fbclid (clique real num anúncio Meta) — distinto de `origem=meta_ads` (que também conta UTM manual sem clique de anúncio). */
  visitantesMeta: number;
  leadsTotal: number;
  vendasAtribuidas: number;
  receitaAtribuida: number;
  porCampanha: CampanhaMarketing[];
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
 *
 * Fase 255: "Visitantes" contava `loja_sessoes` criadas na janela — como
 * o UID de sessão fica salvo no localStorage sem expiração, um cliente
 * recorrente nunca mais é contado depois da 1ª visita de todas, mesmo
 * visitando todo dia (confirmado ao vivo: 722 visualizações em 30 dias
 * com apenas 1 "visitante" no mesmo período). Agora conta sessões
 * DISTINTAS com pelo menos um evento dentro da janela, usando
 * `loja_eventos` (que guarda o timestamp de cada evento individualmente,
 * não só o mais recente) — reflete quem esteve realmente ativo no
 * período, não só quem chegou pela primeira vez.
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
    { data: eventos },
    { data: pedidos },
  ] = await Promise.all([
    supabase.from("loja_sessoes").select("*", { count: "exact", head: true }).gte("ultima_atividade_em", doisMinAtras.toISOString()),
    supabase.from("loja_eventos").select("tipo, criado_em, sessao_uid").gte("criado_em", janelaMaisLarga.toISOString()),
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

  const sessoesDistintasNaJanela = (desde: Date, ate?: Date) => {
    const uids = new Set<string>();
    for (const e of eventos ?? []) {
      if (e.criado_em >= desde.toISOString() && (!ate || e.criado_em < ate.toISOString())) uids.add(e.sessao_uid);
    }
    return uids.size;
  };

  const pedidosNaJanela = (desde: Date, ate?: Date) =>
    (pedidos ?? []).filter((p) => p.updated_at >= desde.toISOString() && (!ate || p.updated_at < ate.toISOString()));
  const somar = (linhas: { valor_total: number }[]) => linhas.reduce((acc, v) => acc + Number(v.valor_total ?? 0), 0);

  const visitantesHoje = sessoesDistintasNaJanela(hojeInicio);
  const visitantesOntem = sessoesDistintasNaJanela(ontemInicio, hojeInicio);
  const visitantesSemana = sessoesDistintasNaJanela(semanaInicio);
  const visitantesMes = sessoesDistintasNaJanela(mesInicio);
  const visitantesMesAnterior = sessoesDistintasNaJanela(mesAnteriorInicio, mesInicio);

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

  // Fase 255 — funil de checkout (Fase 197) exposto pela 1ª vez: os
  // eventos já eram gravados, nenhum service os lia. Janela de 30 dias,
  // igual às outras métricas "mes".
  const funilCheckout: FunilCheckout = {
    visualizacoes: viewsMes,
    carrinhos: carrinhosMes,
    checkoutIniciado: contarNaJanela(eventosPorTipo("checkout_started"), mesInicio),
    pagamentoAprovado: contarNaJanela(eventosPorTipo("payment_success"), mesInicio),
  };

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
    funilCheckout,
  };
}

/**
 * Últimas atividades — pageview de produto, add_to_cart, venda. Sem
 * identidade de visitante anônimo (pedido explícito).
 *
 * Fase 255, dois bugs corrigidos:
 * - Não tinha corte de tempo nenhum: buscava só "os N mais recentes de
 *   todos os tempos", então evento de meses atrás ficava exibido como
 *   "atividade agora" indefinidamente enquanto não houvesse eventos
 *   novos suficientes pra empurrá-lo pra fora da lista (confirmado ao
 *   vivo: entradas de "há 927h"/"há 1104h"). Agora corta em 48h — se
 *   não há nada nesse intervalo, mostra a lista vazia em vez de dado
 *   velho.
 * - `.not("produto_id","is",null)` excluía 100% dos pageviews (nunca
 *   carregam produto_id, em nenhuma página), todo add-to-cart de
 *   aparelho (iPhone/Apple Watch seminovo — a maior parte do catálogo,
 *   só preenchem `aparelho_id`) e todo lacrado (não tinha FK nenhuma
 *   pra se atribuir). Confirmado ao vivo: um add-to-cart real de um
 *   Apple Watch seminovo não apareceu na lista. Agora usa o evento
 *   `product_view` (visualização já atribuída, Fase 255) em vez de
 *   `pageview` genérico, e aceita produto_id OU aparelho_id OU
 *   lacrado_modelo_id preenchido.
 */
export async function obterAtividadeRecente(limite = 15): Promise<AtividadeRecente[]> {
  const supabase = await createClient();
  const corteTempo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const [{ data: eventos }, { data: vendasRecentes }] = await Promise.all([
    supabase
      .from("loja_eventos")
      .select(
        "id, tipo, pagina, criado_em, produto:produtos(nome), aparelho:aparelhos(produto:produtos(nome)), lacradoModelo:catalogo_lacrados_modelos(nome)"
      )
      .in("tipo", ["product_view", "add_to_cart"])
      .or("produto_id.not.is.null,aparelho_id.not.is.null,lacrado_modelo_id.not.is.null")
      .gte("criado_em", corteTempo)
      .order("criado_em", { ascending: false })
      .limit(limite),
    supabase.from("pedidos_loja").select("id, valor_total, updated_at").eq("status", "concluido").gte("updated_at", corteTempo).order("updated_at", { ascending: false }).limit(5),
  ]);

  const itensEventos: AtividadeRecente[] = (eventos ?? []).map((e) => {
    const produto = e.produto as unknown as { nome: string } | null;
    const aparelho = e.aparelho as unknown as { produto: { nome: string } | null } | null;
    const lacradoModelo = e.lacradoModelo as unknown as { nome: string } | null;
    const nome = produto?.nome ?? aparelho?.produto?.nome ?? lacradoModelo?.nome ?? "um produto";
    return {
      id: e.id,
      tipo: e.tipo === "add_to_cart" ? "add_to_cart" : "pageview",
      descricao: e.tipo === "add_to_cart" ? `🛒 Adicionou ${nome} ao carrinho` : `👀 Visualizou ${nome}`,
      quando: e.criado_em,
    };
  });

  const itensVendas: AtividadeRecente[] = (vendasRecentes ?? []).map((v) => ({
    id: v.id, tipo: "venda" as const, descricao: "💰 Venda realizada", quando: v.updated_at,
  }));

  return [...itensEventos, ...itensVendas].sort((a, b) => b.quando.localeCompare(a.quando)).slice(0, limite);
}

/**
 * Produtos mais acessados — views, carrinhos e vendas por produto,
 * ordenado por visualização.
 *
 * Fase 255: mesmo problema de `obterAtividadeRecente` — o filtro só
 * aceitava `produto_id`, que pageview nunca preenche e add-to-cart de
 * aparelho (seminovo) nem lacrado também não. Resultado confirmado ao
 * vivo: "Views" sempre em zero pra todo produto, por construção, mesmo
 * com centenas de pageviews reais no período. Agora usa o evento
 * `product_view` (Fase 255, atribuído de propósito) em vez de
 * `pageview` genérico, busca também por `aparelho_id`/`lacrado_modelo_id`,
 * e resolve aparelho pro `produto_id` do catálogo pai
 * (`aparelhos.produto_id`) — um iPhone seminovo específico pertence a
 * um produto do catálogo, sem isso não dá pra agrupar "views do iPhone
 * 16 Plus" por modelo. Lacrado não tem produto pai (catálogo
 * separado), então agrupa pelo próprio `lacrado_modelo_id`, com chave
 * prefixada pra nunca colidir com um uuid de `produtos`.
 */
export async function obterProdutosDestaque(limite = 10): Promise<ProdutoDestaque[]> {
  const supabase = await createClient();
  const trintaDiasAtras = new Date();
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

  const { data: eventos } = await supabase
    .from("loja_eventos")
    .select(
      "tipo, produto_id, lacrado_modelo_id, produto:produtos(nome), aparelho:aparelhos(produto_id, produto:produtos(nome)), lacradoModelo:catalogo_lacrados_modelos(nome)"
    )
    .or("produto_id.not.is.null,aparelho_id.not.is.null,lacrado_modelo_id.not.is.null")
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
    const produtoDireto = e.produto as unknown as { nome: string } | null;
    const aparelho = e.aparelho as unknown as { produto_id: string | null; produto: { nome: string } | null } | null;
    const lacradoModelo = e.lacradoModelo as unknown as { nome: string } | null;

    // Chave do mapa: produto_id direto, produto pai do aparelho, ou
    // lacrado prefixado (namespace próprio — nunca é o mesmo id de um
    // produto de verdade, então nunca soma visualização/carrinho do
    // item errado por coincidência de uuid).
    const chave = e.produto_id ?? aparelho?.produto_id ?? (e.lacrado_modelo_id ? `lacrado:${e.lacrado_modelo_id}` : null);
    const nome = produtoDireto?.nome ?? aparelho?.produto?.nome ?? lacradoModelo?.nome ?? null;
    if (!chave || !nome) continue;
    const atual = mapa.get(chave) ?? { nome, visualizacoes: 0, carrinhos: 0, vendas: 0 };
    if (e.tipo === "product_view") atual.visualizacoes++;
    else if (e.tipo === "add_to_cart") atual.carrinhos++;
    mapa.set(chave, atual);
  }

  for (const v of itensVendidos ?? []) {
    if (!v.produto_id) continue;
    const atual = mapa.get(v.produto_id);
    if (atual) atual.vendas += v.quantidade;
  }

  return Array.from(mapa.values()).sort((a, b) => b.visualizacoes - a.visualizacoes).slice(0, limite);
}

/**
 * Marketing — Fase 262/Fase 7 do briefing Meta Pixel/CAPI. Responde,
 * com dado real (nunca estimado): quantos visitantes chegaram por um
 * clique de anúncio Meta de verdade (fbclid, não só UTM manual),
 * quantos viraram lead (fechamento por WhatsApp, Fase 262), quantas
 * vendas e quanta receita cada campanha trouxe — usando a atribuição
 * já congelada em `pedidos_loja` no momento da compra (ver
 * `payment.controller.ts → criarPedidoParaCheckout`), não a sessão
 * atual (que pode já ter mudado de atribuição).
 *
 * Fica vazio/zerado honestamente enquanto não houver nenhum pedido com
 * UTM/fbclid gravado (loja sem tráfego pago configurado ainda) — nunca
 * inventa campanha.
 */
export async function obterResumoMarketing(): Promise<ResumoMarketing> {
  const supabase = await createClient();
  const trintaDiasAtras = new Date();
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

  const [{ data: sessoes }, { count: leadsCount }, { data: pedidos }] = await Promise.all([
    supabase.from("loja_sessoes").select("fbclid").gte("criado_em", trintaDiasAtras.toISOString()),
    supabase.from("loja_eventos").select("id", { count: "exact", head: true }).eq("tipo", "lead").gte("criado_em", trintaDiasAtras.toISOString()),
    supabase
      .from("pedidos_loja")
      .select("valor_total, utm_campaign, utm_source, fbclid, status")
      .eq("status", "concluido")
      .gte("updated_at", trintaDiasAtras.toISOString()),
  ]);

  const visitantesMeta = (sessoes ?? []).filter((s) => !!s.fbclid).length;

  const porCampanhaMapa = new Map<string, CampanhaMarketing>();
  let vendasAtribuidas = 0;
  let receitaAtribuida = 0;
  for (const p of pedidos ?? []) {
    if (!p.utm_campaign && !p.fbclid) continue; // sem nenhum dado de atribuição — não entra no "atribuído", mas segue contando no faturamento geral (outros cards)
    vendasAtribuidas += 1;
    receitaAtribuida += Number(p.valor_total ?? 0);
    const chave = p.utm_campaign || (p.fbclid ? "(Meta Ads sem campanha nomeada)" : "outros");
    const atual = porCampanhaMapa.get(chave) ?? { campanha: chave, origem: p.utm_source || (p.fbclid ? "meta_ads" : "outros"), pedidos: 0, receita: 0, leads: 0 };
    atual.pedidos += 1;
    atual.receita += Number(p.valor_total ?? 0);
    porCampanhaMapa.set(chave, atual);
  }

  return {
    visitantesMeta,
    leadsTotal: leadsCount ?? 0,
    vendasAtribuidas,
    receitaAtribuida,
    porCampanha: Array.from(porCampanhaMapa.values()).sort((a, b) => b.receita - a.receita),
  };
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

/**
 * Gráfico de visitantes — hoje (por hora) ou 7/30 dias (por dia).
 *
 * Fase 255: contava linhas de `loja_sessoes` (criação de sessão), mesmo
 * problema do card "Visitantes" (item B em obterResumoLojaAnalytics) —
 * uma sessão recorrente nunca aparecia de novo no gráfico depois da 1ª
 * vez. Agora conta sessões distintas com evento em cada hora/dia, via
 * `loja_eventos`.
 */
export async function obterGraficoVisitantes(periodo: "hoje" | "7dias" | "30dias"): Promise<PontoGrafico[]> {
  const supabase = await createClient();
  const agora = new Date();

  if (periodo === "hoje") {
    const hojeInicio = inicioDoDiaBrasilia(agora);
    const { data } = await supabase.from("loja_eventos").select("criado_em, sessao_uid").gte("criado_em", hojeInicio.toISOString());

    const porHora: Set<string>[] = Array.from({ length: 24 }, () => new Set());
    for (const e of data ?? []) porHora[horaBrasilia(new Date(e.criado_em))].add(e.sessao_uid);

    return porHora.map((uids, hora) => ({ rotulo: `${String(hora).padStart(2, "0")}h`, valor: uids.size }));
  }

  const dias = periodo === "7dias" ? 7 : 30;
  const inicio = new Date(inicioDoDiaBrasilia(agora));
  inicio.setUTCDate(inicio.getUTCDate() - (dias - 1));

  const { data } = await supabase.from("loja_eventos").select("criado_em, sessao_uid").gte("criado_em", inicio.toISOString());

  const porDia = new Map<string, Set<string>>();
  for (let i = 0; i < dias; i++) {
    const d = new Date(inicio);
    d.setDate(d.getDate() + i);
    porDia.set(d.toISOString().slice(0, 10), new Set());
  }
  for (const e of data ?? []) {
    // Chave do dia sempre no fuso de Brasília — usar o prefixo cru do
    // timestamp (UTC) botava evento perto da meia-noite no dia errado.
    const { ano, mes, dia } = obterDataHoraBrasilia(new Date(e.criado_em));
    const chave = `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    porDia.get(chave)?.add(e.sessao_uid);
  }

  return Array.from(porDia.entries()).map(([data, uids]) => {
    const [, mes, dia] = data.split("-");
    return { rotulo: `${dia}/${mes}`, valor: uids.size };
  });
}
