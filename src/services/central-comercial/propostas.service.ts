import { createClient } from "@/lib/supabase/server";
import { obterPricingEnginePublico } from "@/services/precificacao/precificacao-publico.service";
import { obterAvaliacao } from "@/services/trade-in/aplicacao.service";
import { obterCustoItem } from "@/services/estoque/estoque.service";
import { enviarMensagem } from "@/services/whatsapp/whatsapp.service";
import { avaliarDesconto, type AvaliacaoDesconto } from "@/services/vendas/desconto";
import { buscarItemParaProposta, obterRegraDesconto } from "./central-comercial.service";
import { calcularProposta, distribuirValor, mensagemComercial, parcelamentoDisponivel, totalDasLinhas, type LinhaProposta, type ModoAtendimento, type PropostaCalculada } from "./proposta";
import { estadoDaProposta, type EstadoProposta, type EventoResumo } from "./propostas-estado";

/**
 * Proposta comercial de ponta a ponta (servidor):
 *  - preços SEMPRE recalculados aqui, pelo motor público da loja (o mesmo da loja virtual), nunca aceitos do navegador;
 *  - vendedora não recebe custo nem margem (só admin/gerente recebem `resultadoEstimado`);
 *  - salvar é idempotente (não duplica por duplo clique) e retomar atualiza a MESMA proposta;
 *  - o histórico (migration fase268) é complementar: se a migration não foi aplicada, a proposta ainda funciona e a tela avisa.
 */

export interface ItemEntrada { tipo: "aparelho" | "produto"; id: string; quantidade: number }
export interface ComposicaoEntrada {
  itens: ItemEntrada[];
  desconto: number;
  tradeInId?: string | null;
  clienteId?: string | null;
  clienteNome?: string | null;
  modo: ModoAtendimento;
  observacoes?: string | null;
  conversaId?: string | null;
}
export interface LinhaResultado extends LinhaProposta { tipo: "aparelho" | "produto"; id: string }
export interface ResultadoComposicao {
  linhas: LinhaResultado[];
  proposta: PropostaCalculada;
  avaliacaoDesconto: AvaliacaoDesconto;
  parcelamentoConfigurado: boolean;
  tradeIn: { id: string; modeloNome: string; valor: number } | null;
  texto: string;
  /** Somente admin/gerente. Para os demais nem é calculado. */
  resultadoEstimado: { custo: number; resultado: number } | null;
}

const MAX_ITENS = 15;
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

function colunaAusente(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  return err.code === "42703" || err.code === "PGRST204" || err.code === "42P01" || err.code === "PGRST205" || /column .* does not exist|Could not find the .* column|relation .* does not exist|Could not find the table/i.test(err.message ?? "");
}

export async function simularComposicao(params: ComposicaoEntrada & { cargo: string; usuarioId?: string | null; validadeAte?: string | null }): Promise<ResultadoComposicao> {
  const { itens } = params;
  if (itens.length === 0) throw new Error("Adicione pelo menos um item à proposta.");
  if (itens.length > MAX_ITENS) throw new Error(`Uma proposta aceita até ${MAX_ITENS} itens.`);
  const chaves = new Set<string>();
  for (const i of itens) {
    const k = `${i.tipo}:${i.id}`;
    if (chaves.has(k)) throw new Error("Há um item repetido na proposta. Ajuste a quantidade em vez de adicionar de novo.");
    chaves.add(k);
    if (!Number.isInteger(i.quantidade) || i.quantidade < 1 || i.quantidade > 20) throw new Error("A quantidade de cada item deve ser de 1 a 20.");
    if (i.tipo === "aparelho" && i.quantidade !== 1) throw new Error("Cada aparelho é uma unidade. Adicione outro aparelho se for o caso.");
  }

  const supabase = await createClient();
  const [resolvidos, engine, regra] = await Promise.all([
    Promise.allSettled(itens.map((i) => buscarItemParaProposta(i.tipo, i.id))),
    obterPricingEnginePublico(),
    obterRegraDesconto(),
  ]);
  const problemas = resolvidos.flatMap((r, idx) => (r.status === "rejected" ? [`${r.reason instanceof Error ? r.reason.message : "Item indisponível"} (item ${idx + 1})`] : []));
  if (problemas.length > 0) throw new Error(problemas.join(" "));
  const dados = resolvidos.map((r) => (r as PromiseFulfilledResult<Awaited<ReturnType<typeof buscarItemParaProposta>>>).value);

  // Saldo dos produtos (acessórios): nunca propor mais do que existe.
  const idsProdutos = itens.filter((i) => i.tipo === "produto").map((i) => i.id);
  if (idsProdutos.length > 0) {
    const { data: saldos } = await supabase.from("vw_produtos_saldo").select("produto_id, saldo").in("produto_id", idsProdutos);
    const mapa = new Map((saldos ?? []).map((s) => [s.produto_id, Number(s.saldo)]));
    itens.forEach((i, idx) => {
      if (i.tipo !== "produto") return;
      const saldo = mapa.get(i.id) ?? 0;
      if (saldo < i.quantidade) throw new Error(`Só há ${saldo} em estoque de "${dados[idx].descricao}".`);
    });
  }

  const linhas: LinhaResultado[] = dados.map((d, idx) => ({ tipo: d.tipo, id: d.id, descricao: d.descricao, quantidade: itens[idx].quantidade, precoUnitario: d.preco }));
  const precoTabela = totalDasLinhas(linhas);

  let tradeIn: ResultadoComposicao["tradeIn"] = null;
  if (params.tradeInId) {
    const av = await obterAvaliacao(params.tradeInId);
    if (!av) throw new Error("Avaliação de trade-in não encontrada.");
    if (av.status !== "aprovado") throw new Error("Só uma avaliação de trade-in já aprovada pela equipe pode entrar na proposta.");
    if (params.clienteId && av.cliente_id && av.cliente_id !== params.clienteId) throw new Error("Essa avaliação de trade-in pertence a outro cliente.");
    tradeIn = { id: av.id, modeloNome: av.modelo_nome, valor: av.valor_aprovado ?? av.valor_calculado };
  }

  const desconto = r2(Math.max(0, Number(params.desconto) || 0));
  const avaliacaoDesconto = avaliarDesconto({ cargo: params.cargo, valorBruto: precoTabela, desconto, regra });
  if (avaliacaoDesconto.situacao === "invalido") throw new Error(avaliacaoDesconto.motivo);
  const proposta = calcularProposta(engine, { precoTabela, desconto, tradeInValor: tradeIn?.valor ?? 0 });

  let resultadoEstimado: ResultadoComposicao["resultadoEstimado"] = null;
  if (params.cargo === "admin" || params.cargo === "gerente") {
    const custos = await Promise.all(linhas.map(async (l) => (await obterCustoItem(l.tipo === "aparelho" ? { aparelhoId: l.id } : { produtoId: l.id })) * l.quantidade));
    const custo = r2(custos.reduce((a, b) => a + b, 0));
    resultadoEstimado = { custo, resultado: r2(proposta.baseLiquida - custo) };
  }

  let vendedor: string | null = null;
  if (params.usuarioId) {
    const { data } = await supabase.from("usuarios").select("nome").eq("id", params.usuarioId).maybeSingle();
    vendedor = data?.nome ?? null;
  }

  return {
    linhas, proposta, avaliacaoDesconto, tradeIn, resultadoEstimado,
    parcelamentoConfigurado: parcelamentoDisponivel(proposta),
    texto: mensagemComercial({ linhas, proposta, nomeCliente: params.clienteNome, vendedor, validadeAte: params.validadeAte, modo: params.modo }),
  };
}

// ---------------------------------------------------------------------------
// Histórico (best-effort: nunca derruba a operação principal)
// ---------------------------------------------------------------------------

export type TipoEvento = "criada" | "editada" | "copiada" | "whatsapp_aberto" | "enviada" | "aguardando_resposta" | "aceita" | "recusada" | "observacao";

export async function registrarEventoProposta(params: { orcamentoId: string; tipo: TipoEvento; usuarioId: string; modo?: ModoAtendimento | null; conversaId?: string | null; dados?: Record<string, unknown> }): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("proposta_eventos").insert({
    orcamento_id: params.orcamentoId, tipo: params.tipo, usuario_id: params.usuarioId,
    modo: params.modo ?? null, conversa_id: params.conversaId ?? null, dados: params.dados ?? {},
  });
  if (error) {
    console.error("Histórico da proposta indisponível (aplicar fase268?):", error.message);
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Salvar / retomar
// ---------------------------------------------------------------------------

export interface ResultadoSalvar { orcamentoId: string; reaproveitada: boolean; atualizada: boolean; historicoDisponivel: boolean }
const JANELA_DUPLICIDADE_MS = 3 * 60_000;

export async function salvarProposta(params: ComposicaoEntrada & { clienteId: string; usuarioId: string; cargo: string; retomarId?: string | null; validadeDias?: number }): Promise<ResultadoSalvar> {
  const supabase = await createClient();
  const dias = Math.min(Math.max(Math.trunc(params.validadeDias ?? 3), 1), 30);
  const validade = new Date(Date.now() + dias * 86_400_000).toISOString().slice(0, 10);

  const r = await simularComposicao({ ...params, usuarioId: params.usuarioId, validadeAte: validade });
  if (r.avaliacaoDesconto.situacao === "requer_aprovacao") {
    throw new Error(`Este desconto (${r.avaliacaoDesconto.percentual}%) passa do seu limite de ${r.avaliacaoDesconto.limite}%. Peça a aprovação do gerente no PDV antes de salvar a proposta.`);
  }

  if (params.conversaId) {
    const { data: conversa } = await supabase.from("whatsapp_conversas").select("id, cliente_id").eq("id", params.conversaId).maybeSingle();
    if (!conversa) throw new Error("Conversa não encontrada.");
    if (conversa.cliente_id !== params.clienteId) throw new Error("Esta conversa não pertence ao cliente escolhido.");
  }

  const valorTotal = r.proposta.aVista;
  const somaItens = r2(valorTotal + r.proposta.tradeInValor);
  const unitarios = distribuirValor(r.linhas, somaItens);
  const itensLinhas = r.linhas.map((l, i) => ({
    produto_id: l.tipo === "produto" ? l.id : null, aparelho_id: l.tipo === "aparelho" ? l.id : null, quantidade: l.quantidade, valor: unitarios[i],
  }));

  const basico = { cliente_id: params.clienteId, usuario_id: params.usuarioId, valor: valorTotal, forma_pagamento: "pix", validade };
  const extras = {
    modo_atendimento: params.modo, conversa_id: params.conversaId ?? null, desconto: r.proposta.desconto,
    trade_in_avaliacao_id: r.tradeIn?.id ?? null, observacoes: params.observacoes?.trim() || null,
  };

  // ---- Retomar: atualiza a MESMA proposta (nunca cria outra)
  if (params.retomarId) {
    const { data: atual } = await supabase.from("orcamentos").select("id, usuario_id, cliente_id, status").eq("id", params.retomarId).maybeSingle();
    if (!atual) throw new Error("Proposta não encontrada.");
    if (params.cargo === "vendedor" && atual.usuario_id !== params.usuarioId) throw new Error("Esta proposta é de outra pessoa da equipe.");
    if (atual.status === "aprovado") throw new Error("Esta proposta já virou venda e não pode mais ser alterada.");
    if (atual.cliente_id !== params.clienteId) throw new Error("Para trocar o cliente, faça uma proposta nova.");
    let { error } = await supabase.from("orcamentos").update({ ...basico, ...extras }).eq("id", atual.id);
    let historico = true;
    if (error && colunaAusente(error)) {
      if (r.tradeIn) throw new Error("Propostas com troca exigem a migration fase268 aplicada.");
      historico = false;
      ({ error } = await supabase.from("orcamentos").update(basico).eq("id", atual.id));
    }
    if (error) throw new Error(`Não foi possível atualizar a proposta: ${error.message}`);
    const { error: erroDel } = await supabase.from("orcamento_itens").delete().eq("orcamento_id", atual.id);
    if (erroDel) throw new Error(`Não foi possível atualizar os itens: ${erroDel.message}`);
    const { error: erroIns } = await supabase.from("orcamento_itens").insert(itensLinhas.map((l) => ({ ...l, orcamento_id: atual.id })));
    if (erroIns) throw new Error(`Os itens não foram regravados. Salve novamente: ${erroIns.message}`);
    const registrou = await registrarEventoProposta({ orcamentoId: atual.id, tipo: "editada", usuarioId: params.usuarioId, modo: params.modo, conversaId: params.conversaId });
    return { orcamentoId: atual.id, reaproveitada: false, atualizada: true, historicoDisponivel: historico && registrou };
  }

  // ---- Duplo clique / reenvio acidental: mesma pessoa, mesmo cliente, mesmo valor, poucos minutos
  const desde = new Date(Date.now() - JANELA_DUPLICIDADE_MS).toISOString();
  const { data: recentes } = await supabase.from("orcamentos").select("id")
    .eq("cliente_id", params.clienteId).eq("usuario_id", params.usuarioId).eq("valor", valorTotal).eq("status", "criado").gte("data_criacao", desde).limit(1);
  if (recentes && recentes.length > 0) return { orcamentoId: recentes[0].id, reaproveitada: true, atualizada: false, historicoDisponivel: true };

  let historico = true;
  let { data: criado, error } = await supabase.from("orcamentos").insert({ ...basico, ...extras }).select("id").single();
  if (error && colunaAusente(error)) {
    if (r.tradeIn) throw new Error("Propostas com troca exigem a migration fase268 aplicada.");
    historico = false;
    ({ data: criado, error } = await supabase.from("orcamentos").insert(basico).select("id").single());
  }
  if (error || !criado) throw new Error(`Não foi possível salvar a proposta: ${error?.message ?? "erro desconhecido"}`);
  const { error: erroItens } = await supabase.from("orcamento_itens").insert(itensLinhas.map((l) => ({ ...l, orcamento_id: criado!.id })));
  if (erroItens) {
    await supabase.from("orcamentos").delete().eq("id", criado.id); // proposta sem itens não pode existir
    throw new Error(`Não foi possível registrar os itens da proposta: ${erroItens.message}`);
  }
  const registrou = await registrarEventoProposta({ orcamentoId: criado.id, tipo: "criada", usuarioId: params.usuarioId, modo: params.modo, conversaId: params.conversaId });
  return { orcamentoId: criado.id, reaproveitada: false, atualizada: false, historicoDisponivel: historico && registrou };
}

// ---------------------------------------------------------------------------
// Compartilhamento (só conta como "enviada" com confirmação real)
// ---------------------------------------------------------------------------

async function carregarPropostaDoUsuario(orcamentoId: string, usuarioId: string, cargo: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("orcamentos").select("id, cliente_id, usuario_id, status").eq("id", orcamentoId).maybeSingle();
  if (!data) throw new Error("Proposta não encontrada.");
  if (cargo === "vendedor" && data.usuario_id !== usuarioId) throw new Error("Esta proposta é de outra pessoa da equipe.");
  return data;
}

async function marcarComoEnviada(orcamentoId: string) {
  const supabase = await createClient();
  await supabase.from("orcamentos").update({ status: "enviado" }).eq("id", orcamentoId).eq("status", "criado");
}

/** Envia pela integração de WhatsApp. Só registra "enviada" se a integração confirmar; caso contrário, avisa que NÃO foi enviada. */
export async function enviarPropostaPeloWhatsapp(params: { orcamentoId: string; conversaId: string; texto: string; usuarioId: string; cargo: string }): Promise<void> {
  const texto = params.texto.trim();
  if (!texto) throw new Error("A mensagem está vazia.");
  if (texto.length > 3500) throw new Error("A mensagem está longa demais para o WhatsApp. Encurte o texto.");
  const orc = await carregarPropostaDoUsuario(params.orcamentoId, params.usuarioId, params.cargo);
  const supabase = await createClient();
  const { data: conversa } = await supabase.from("whatsapp_conversas").select("id, cliente_id, telefone, nao_contatar").eq("id", params.conversaId).maybeSingle();
  if (!conversa) throw new Error("Conversa não encontrada.");
  if (conversa.cliente_id !== orc.cliente_id) throw new Error("Esta conversa não pertence ao cliente da proposta.");
  if (conversa.nao_contatar === true) throw new Error("Este cliente pediu para não ser contatado. A mensagem não foi enviada.");
  const msg = await enviarMensagem({ conversaId: conversa.id, telefone: conversa.telefone, texto, usuarioId: params.usuarioId });
  if ((msg as unknown as { status_entrega?: string }).status_entrega !== "enviado") {
    throw new Error("O WhatsApp não confirmou o envio. A mensagem NÃO foi enviada: tente de novo ou copie o texto.");
  }
  await marcarComoEnviada(orc.id);
  await registrarEventoProposta({ orcamentoId: orc.id, tipo: "enviada", usuarioId: params.usuarioId, modo: "whatsapp", conversaId: conversa.id, dados: { confirmacao: "integracao" } });
}

export async function registrarCompartilhamento(params: { orcamentoId: string; tipo: "copiada" | "whatsapp_aberto" | "enviada_manual"; usuarioId: string; cargo: string; modo?: ModoAtendimento | null }): Promise<boolean> {
  const orc = await carregarPropostaDoUsuario(params.orcamentoId, params.usuarioId, params.cargo);
  if (params.tipo === "enviada_manual") {
    await marcarComoEnviada(orc.id);
    return registrarEventoProposta({ orcamentoId: orc.id, tipo: "enviada", usuarioId: params.usuarioId, modo: params.modo, dados: { confirmacao: "informada_pela_vendedora" } });
  }
  return registrarEventoProposta({ orcamentoId: orc.id, tipo: params.tipo, usuarioId: params.usuarioId, modo: params.modo });
}

export async function registrarRespostaDoCliente(params: { orcamentoId: string; resposta: "aceita" | "recusada" | "aguardando_resposta"; usuarioId: string; cargo: string; observacao?: string | null }): Promise<boolean> {
  const orc = await carregarPropostaDoUsuario(params.orcamentoId, params.usuarioId, params.cargo);
  if (orc.status === "aprovado") throw new Error("Esta proposta já virou venda.");
  const supabase = await createClient();
  if (params.resposta === "recusada") await supabase.from("orcamentos").update({ status: "recusado" }).eq("id", orc.id);
  else if (orc.status === "recusado") await supabase.from("orcamentos").update({ status: "criado" }).eq("id", orc.id);
  return registrarEventoProposta({ orcamentoId: orc.id, tipo: params.resposta, usuarioId: params.usuarioId, dados: params.observacao ? { observacao: params.observacao.slice(0, 300) } : {} });
}

// ---------------------------------------------------------------------------
// Listagem e retomada
// ---------------------------------------------------------------------------

export interface PropostaResumo {
  id: string; clienteId: string; clienteNome: string; clienteWhatsapp: string | null; valor: number; criadaEm: string; atualizadaEm: string;
  validade: string | null; modo: ModoAtendimento | null; conversaId: string | null; estado: EstadoProposta; ultimaAcao: { texto: string; em: string } | null; itens: number;
}

export async function listarPropostas(params: { usuarioId: string; cargo: string; limite?: number; agora?: Date }): Promise<{ propostas: PropostaResumo[]; historicoDisponivel: boolean }> {
  const supabase = await createClient();
  const agora = params.agora ?? new Date();
  const limite = Math.min(Math.max(params.limite ?? 60, 1), 200);
  const montar = (campos: string) => {
    let q = supabase.from("orcamentos").select(`${campos}, cliente:clientes(nome, whatsapp), itens:orcamento_itens(quantidade)`).order("data_criacao", { ascending: false }).limit(limite);
    if (params.cargo === "vendedor") q = q.eq("usuario_id", params.usuarioId);
    return q;
  };
  let { data, error } = await montar("id, cliente_id, valor, status, validade, data_criacao, updated_at, modo_atendimento, conversa_id");
  let extras = true;
  if (error && colunaAusente(error)) { extras = false; ({ data, error } = await montar("id, cliente_id, valor, status, validade, data_criacao, updated_at")); }
  if (error) throw new Error(`Não foi possível carregar as propostas: ${error.message}`);
  const linhas = (data ?? []) as unknown as Array<Record<string, any>>; // eslint-disable-line @typescript-eslint/no-explicit-any

  const eventos = new Map<string, Array<EventoResumo & { tipo: string }>>();
  let historicoDisponivel = true;
  if (linhas.length > 0) {
    const { data: ev, error: erroEv } = await supabase.from("proposta_eventos").select("orcamento_id, tipo, criado_em").in("orcamento_id", linhas.map((l) => l.id)).order("criado_em", { ascending: true });
    if (erroEv) historicoDisponivel = false;
    for (const e of ev ?? []) { const l = eventos.get(e.orcamento_id) ?? []; l.push({ tipo: e.tipo, criado_em: e.criado_em }); eventos.set(e.orcamento_id, l); }
  }
  const { textoDoEvento } = await import("./propostas-estado");
  return {
    historicoDisponivel: historicoDisponivel && extras,
    propostas: linhas.map((l): PropostaResumo => {
      const evs = eventos.get(l.id) ?? [];
      const ultimo = evs[evs.length - 1];
      return {
        id: l.id, clienteId: l.cliente_id, clienteNome: l.cliente?.nome ?? "Cliente", clienteWhatsapp: l.cliente?.whatsapp ?? null,
        valor: Number(l.valor), criadaEm: l.data_criacao, atualizadaEm: l.updated_at ?? l.data_criacao, validade: l.validade ?? null,
        modo: (l.modo_atendimento as ModoAtendimento | null) ?? null, conversaId: l.conversa_id ?? null,
        estado: estadoDaProposta({ status: l.status, validade: l.validade ?? null, eventos: evs, agora }),
        ultimaAcao: ultimo ? { texto: textoDoEvento(ultimo.tipo), em: ultimo.criado_em } : null,
        itens: (l.itens ?? []).length,
      };
    }),
  };
}

export interface PropostaParaRetomar {
  orcamentoId: string; clienteId: string; clienteNome: string; clienteWhatsapp: string | null; itens: ItemEntrada[]; desconto: number; tradeInId: string | null;
  modo: ModoAtendimento; conversaId: string | null; observacoes: string | null; estado: EstadoProposta;
}

export async function obterPropostaParaRetomar(id: string, usuarioId: string, cargo: string): Promise<PropostaParaRetomar> {
  const supabase = await createClient();
  let { data, error } = await supabase.from("orcamentos")
    .select("id, cliente_id, usuario_id, status, validade, modo_atendimento, conversa_id, desconto, trade_in_avaliacao_id, observacoes, cliente:clientes(nome, whatsapp), itens:orcamento_itens(produto_id, aparelho_id, quantidade)")
    .eq("id", id).maybeSingle();
  if (error && colunaAusente(error)) {
    ({ data, error } = await supabase.from("orcamentos").select("id, cliente_id, usuario_id, status, validade, cliente:clientes(nome, whatsapp), itens:orcamento_itens(produto_id, aparelho_id, quantidade)").eq("id", id).maybeSingle());
  }
  if (error || !data) throw new Error("Proposta não encontrada.");
  const o = data as unknown as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (cargo === "vendedor" && o.usuario_id !== usuarioId) throw new Error("Esta proposta é de outra pessoa da equipe.");
  if (o.status === "aprovado") throw new Error("Esta proposta já virou venda.");
  const { data: ev } = await supabase.from("proposta_eventos").select("tipo, criado_em").eq("orcamento_id", id).order("criado_em", { ascending: true });
  return {
    orcamentoId: o.id, clienteId: o.cliente_id, clienteNome: o.cliente?.nome ?? "Cliente", clienteWhatsapp: o.cliente?.whatsapp ?? null,
    itens: (o.itens ?? []).map((i: any) => ({ tipo: i.aparelho_id ? "aparelho" : "produto", id: i.aparelho_id ?? i.produto_id, quantidade: Number(i.quantidade) || 1 })), // eslint-disable-line @typescript-eslint/no-explicit-any
    desconto: Number(o.desconto ?? 0), tradeInId: o.trade_in_avaliacao_id ?? null, modo: (o.modo_atendimento as ModoAtendimento) ?? "presencial",
    conversaId: o.conversa_id ?? null, observacoes: o.observacoes ?? null,
    estado: estadoDaProposta({ status: o.status, validade: o.validade ?? null, eventos: ev ?? [], agora: new Date() }),
  };
}

/** Eventos de UMA proposta, para a linha do tempo. */
export async function historicoDaProposta(orcamentoId: string): Promise<Array<{ tipo: string; criado_em: string; usuario_nome: string | null; dados: Record<string, unknown> }>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("proposta_eventos").select("tipo, criado_em, usuario_id, dados").eq("orcamento_id", orcamentoId).order("criado_em", { ascending: false }).limit(40);
  if (error) return [];
  const ids = [...new Set((data ?? []).map((e) => e.usuario_id).filter(Boolean))] as string[];
  const nomes = new Map<string, string>();
  if (ids.length > 0) { const { data: us } = await supabase.from("usuarios").select("id, nome").in("id", ids); for (const u of us ?? []) nomes.set(u.id, u.nome); }
  return (data ?? []).map((e) => ({ tipo: e.tipo, criado_em: e.criado_em, usuario_nome: e.usuario_id ? nomes.get(e.usuario_id) ?? null : null, dados: (e.dados ?? {}) as Record<string, unknown> }));
}

/** Contexto para abrir a proposta a partir de uma conversa do CRM/Comunicação. */
export async function contextoDaConversa(conversaId: string): Promise<{ conversaId: string; clienteId: string; clienteNome: string; whatsapp: string; naoContatar: boolean } | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("whatsapp_conversas").select("id, cliente_id, telefone, nao_contatar, cliente:clientes(nome)").eq("id", conversaId).maybeSingle();
  if (!data || !data.cliente_id) return null;
  const cli = (data as unknown as { cliente: { nome: string } | null }).cliente;
  return { conversaId: data.id, clienteId: data.cliente_id, clienteNome: cli?.nome ?? "Cliente", whatsapp: data.telefone, naoContatar: data.nao_contatar === true };
}

/** Conversa mais recente do cliente (para sugerir o modo WhatsApp e enviar na conversa certa). */
export async function conversaDoCliente(clienteId: string): Promise<{ conversaId: string; naoContatar: boolean } | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("whatsapp_conversas").select("id, nao_contatar").eq("cliente_id", clienteId).order("ultima_mensagem_em", { ascending: false, nullsFirst: false }).limit(1).maybeSingle();
  return data ? { conversaId: data.id, naoContatar: data.nao_contatar === true } : null;
}
