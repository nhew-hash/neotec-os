import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { obterPricingEngine } from "@/services/precificacao/config-precificacao.service";
import { obterAvaliacao } from "@/services/trade-in/aplicacao.service";
import { obterCustoItem } from "@/services/estoque/estoque.service";
import { avaliarDesconto, type AvaliacaoDesconto, type RegraDescontoLoja } from "@/services/vendas/desconto";
import { calcularProgressoMeta, dataRefBrasilia, diasParado, gerarTarefasDoDia, primeiroDiaDoMes, resumoPorResponsavel, type ModeloChecklist, type ProgressoMeta } from "./regras";
import { calcularProposta, textoDaProposta, type PropostaCalculada } from "./proposta";

/**
 * Leituras da Central Comercial. Regras:
 *  - nada de número fictício: sem dado/meta, a função devolve null/[] e a tela diz isso;
 *  - nenhuma função daqui devolve custo ou margem a quem não é admin/gerente (a checagem é
 *    no servidor e, para aparelhos, a view vw_aparelhos_seguro ainda mascara custo no banco);
 *  - falha de uma fonte (tabela ainda sem migration) vira `indisponivel`, não derruba a tela.
 */

export type Carregado<T> = { ok: true; dados: T } | { ok: false; motivo: string };
async function tentar<T>(fn: () => Promise<T>): Promise<Carregado<T>> {
  try { return { ok: true, dados: await fn() }; } catch (e) { return { ok: false, motivo: e instanceof Error ? e.message : "Indisponível" }; }
}

// ---------------------------------------------------------------------------
// Checklist
// ---------------------------------------------------------------------------

export interface TarefaChecklist {
  id: string; titulo: string; descricao: string | null; data_ref: string; prazo: string; status: "pendente" | "concluida" | "dispensada";
  responsavel_id: string; responsavel_nome?: string | null; concluida_em: string | null; observacao: string | null;
}

/** Cria as tarefas de hoje (idempotente: unique modelo+data+responsável). Service role, porque quem abre a tela pode ser vendedora. */
export async function garantirTarefasDoDia(agora = new Date()): Promise<number> {
  const admin = createAdminClient();
  const { data: modelos, error } = await admin.from("checklist_modelos").select("*").eq("ativo", true);
  if (error) throw new Error(error.message);
  if (!modelos || modelos.length === 0) return 0;
  const { data: usuarios } = await admin.from("usuarios").select("id, cargo, loja_id").eq("status", "ativo");
  const tarefas = gerarTarefasDoDia(modelos as ModeloChecklist[], (usuarios ?? []) as { id: string; cargo: string; loja_id: string }[], agora);
  if (tarefas.length === 0) return 0;
  const { data, error: erroIns } = await admin.from("checklist_tarefas").upsert(tarefas, { onConflict: "modelo_id,data_ref,responsavel_id", ignoreDuplicates: true }).select("id");
  if (erroIns) throw new Error(erroIns.message);
  return data?.length ?? 0;
}

export async function listarMinhasTarefas(usuarioId: string, agora = new Date()): Promise<TarefaChecklist[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("checklist_tarefas").select("*").eq("responsavel_id", usuarioId).eq("data_ref", dataRefBrasilia(agora)).order("prazo", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as TarefaChecklist[];
}

export async function atualizarTarefa(id: string, status: "pendente" | "concluida", observacao: string | null): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("checklist_tarefas").update({ status, observacao: observacao?.trim() || null }).eq("id", id).select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Tarefa não encontrada ou sem permissão.");
}

export interface ResumoEquipeChecklist { responsavel_id: string; nome: string; concluidas: number; atrasadas: number; noPrazo: number; total: number }

export async function resumoChecklistDaEquipe(agora = new Date()): Promise<{ equipe: ResumoEquipeChecklist[]; atrasadas: TarefaChecklist[] }> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("checklist_tarefas").select("*, resp:usuarios!responsavel_id(nome)").eq("data_ref", dataRefBrasilia(agora));
  if (error) throw new Error(error.message);
  const linhas = (data ?? []) as (TarefaChecklist & { resp: { nome: string } | null })[];
  const resumo = resumoPorResponsavel(linhas, agora);
  const nomes = new Map(linhas.map((l) => [l.responsavel_id, l.resp?.nome ?? "—"]));
  const atrasadas = linhas.filter((l) => l.status === "pendente" && new Date(l.prazo).getTime() < agora.getTime()).map((l) => ({ ...l, responsavel_nome: l.resp?.nome ?? null }));
  return { equipe: [...resumo.entries()].map(([id, r]) => ({ responsavel_id: id, nome: nomes.get(id) ?? "—", ...r })), atrasadas };
}

export async function listarModelosChecklist(): Promise<ModeloChecklist[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("checklist_modelos").select("*").order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ModeloChecklist[];
}

export async function criarModeloChecklist(input: { titulo: string; descricao: string; cargo: string; frequencia: "diaria" | "semanal" | "mensal"; dia_semana: number | null; dia_mes: number | null; prazo_hora: string }, usuarioId: string): Promise<void> {
  const supabase = await createClient();
  const { data: perfil } = await supabase.from("usuarios").select("loja_id").eq("id", usuarioId).maybeSingle();
  if (!perfil?.loja_id) throw new Error("Loja do usuário não encontrada.");
  if (input.frequencia === "semanal" && input.dia_semana === null) throw new Error("Escolha o dia da semana.");
  if (input.frequencia === "mensal" && input.dia_mes === null) throw new Error("Escolha o dia do mês.");
  const { error } = await supabase.from("checklist_modelos").insert({ ...input, descricao: input.descricao.trim() || null, loja_id: perfil.loja_id, criado_por: usuarioId });
  if (error) throw new Error(`Não foi possível criar a tarefa: ${error.message}`);
}

export async function alternarModeloChecklist(id: string, ativo: boolean): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("checklist_modelos").update({ ativo }).eq("id", id);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Metas e resultados
// ---------------------------------------------------------------------------

export async function resultadoDoMes(usuarioId: string | null, agora = new Date()): Promise<ProgressoMeta & { vendas: number }> {
  const supabase = await createClient();
  const mes = primeiroDiaDoMes(agora);
  const inicio = `${mes}T03:00:00.000Z`; // 00:00 de Brasília

  let q = supabase.from("vw_vendas_seguro").select("valor_total").eq("status", "concluida").gte("data_venda", inicio);
  if (usuarioId) q = q.eq("usuario_id", usuarioId);
  const { data: vendas, error } = await q.limit(5000);
  if (error) throw new Error(error.message);
  const realizado = (vendas ?? []).reduce((acc, v) => acc + Number(v.valor_total ?? 0), 0);

  let mq = supabase.from("metas_vendas").select("valor_meta").eq("mes", mes);
  mq = usuarioId ? mq.eq("usuario_id", usuarioId) : mq.is("usuario_id", null);
  const { data: meta, error: erroMeta } = await mq.maybeSingle();
  if (erroMeta) throw new Error(erroMeta.message);
  return { ...calcularProgressoMeta(meta ? Number(meta.valor_meta) : null, Math.round(realizado * 100) / 100, agora), vendas: vendas?.length ?? 0 };
}

export async function definirMeta(input: { usuarioId: string | null; valor: number }, criadoPor: string, agora = new Date()): Promise<void> {
  if (!(input.valor > 0)) throw new Error("Informe um valor de meta maior que zero.");
  const supabase = await createClient();
  const { data: perfil } = await supabase.from("usuarios").select("loja_id").eq("id", criadoPor).maybeSingle();
  if (!perfil?.loja_id) throw new Error("Loja do usuário não encontrada.");
  const mes = primeiroDiaDoMes(agora);
  let q = supabase.from("metas_vendas").select("id").eq("mes", mes);
  q = input.usuarioId ? q.eq("usuario_id", input.usuarioId) : q.is("usuario_id", null);
  const { data: existente } = await q.maybeSingle();
  const { error } = existente
    ? await supabase.from("metas_vendas").update({ valor_meta: input.valor, updated_at: new Date().toISOString() }).eq("id", existente.id)
    : await supabase.from("metas_vendas").insert({ loja_id: perfil.loja_id, usuario_id: input.usuarioId, mes, valor_meta: input.valor, criado_por: criadoPor });
  if (error) throw new Error(`Não foi possível salvar a meta: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Vendedora: clientes aguardando e orçamentos
// ---------------------------------------------------------------------------

export interface ConversaAguardando { id: string; telefone: string; cliente_nome: string | null; nao_lidas: number; ultima_mensagem_em: string | null }

export async function conversasAguardandoResposta(usuarioId: string, cargo: string): Promise<ConversaAguardando[]> {
  const supabase = await createClient();
  let q = supabase.from("whatsapp_conversas").select("id, telefone, nao_lidas, ultima_mensagem_em, responsavel_id, cliente:clientes(nome)").eq("status", "aberta").gt("nao_lidas", 0);
  if (cargo === "vendedor") q = q.or(`responsavel_id.eq.${usuarioId},responsavel_id.is.null`);
  const { data, error } = await q.order("ultima_mensagem_em", { ascending: true }).limit(30);
  if (error) throw new Error(error.message);
  return (data ?? []).map((c) => ({ id: c.id, telefone: c.telefone, nao_lidas: c.nao_lidas, ultima_mensagem_em: c.ultima_mensagem_em, cliente_nome: (c.cliente as unknown as { nome?: string } | null)?.nome ?? null }));
}

export interface OrcamentoAberto { id: string; cliente_nome: string | null; cliente_whatsapp: string | null; valor: number; status: string; data_criacao: string; dias_parado: number }

/** Orçamentos que ainda não viraram venda. Vendedora vê os seus; gerente/admin veem todos. Nenhum campo de custo. */
export async function orcamentosEmAberto(usuarioId: string, cargo: string, agora = new Date()): Promise<OrcamentoAberto[]> {
  const supabase = await createClient();
  let q = supabase.from("orcamentos").select("id, valor, status, data_criacao, usuario_id, cliente:clientes(nome, whatsapp)").in("status", ["criado", "enviado", "visualizado"]);
  if (cargo === "vendedor") q = q.eq("usuario_id", usuarioId);
  const { data, error } = await q.order("data_criacao", { ascending: true }).limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []).map((o) => {
    const c = o.cliente as unknown as { nome?: string; whatsapp?: string } | null;
    return { id: o.id, valor: Number(o.valor), status: String(o.status), data_criacao: o.data_criacao, cliente_nome: c?.nome ?? null, cliente_whatsapp: c?.whatsapp ?? null, dias_parado: diasParado(o.data_criacao, agora) };
  });
}

// ---------------------------------------------------------------------------
// Gerente
// ---------------------------------------------------------------------------

export interface TradeInPendente { id: string; modelo_nome: string; cliente_nome: string | null; status: string; created_at: string; valor_calculado: number }

export async function tradeInsPendentes(): Promise<TradeInPendente[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("avaliacoes_trade_in").select("id, modelo_nome, cliente_nome, status, created_at, valor_calculado").in("status", ["aguardando_avaliacao", "em_avaliacao"]).order("created_at", { ascending: true }).limit(30);
  if (error) throw new Error(error.message);
  return (data ?? []) as TradeInPendente[];
}

export interface RegistroAuditoria { id: string; entidade: string; acao: string; dados: Record<string, unknown>; criado_em: string; usuario_nome: string | null }

export async function historicoDeAlteracoes(limite = 30): Promise<RegistroAuditoria[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("auditoria_operacoes").select("id, entidade, acao, dados, criado_em, usuario:usuarios!usuario_id(nome)").order("criado_em", { ascending: false }).limit(limite);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({ id: r.id, entidade: r.entidade, acao: r.acao, dados: r.dados as Record<string, unknown>, criado_em: r.criado_em, usuario_nome: (r.usuario as unknown as { nome?: string } | null)?.nome ?? null }));
}

/** Lucro do mês: somente admin/gerente (checagem do chamador + RLS). Usa a tabela `vendas`, nunca a view mascarada. */
export async function lucroDoMes(agora = new Date()): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("vendas").select("lucro").eq("status", "concluida").gte("data_venda", `${primeiroDiaDoMes(agora)}T03:00:00.000Z`).limit(5000);
  if (error) throw new Error(error.message);
  return Math.round((data ?? []).reduce((a, v) => a + Number(v.lucro ?? 0), 0) * 100) / 100;
}

export interface ConversaSemResposta { responsavel_id: string | null; responsavel_nome: string; quantidade: number }

export async function pendenciasPorResponsavel(): Promise<ConversaSemResposta[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("whatsapp_conversas").select("responsavel_id, responsavel:usuarios!responsavel_id(nome)").eq("status", "aberta").gt("nao_lidas", 0).limit(1000);
  if (error) throw new Error(error.message);
  const mapa = new Map<string, ConversaSemResposta>();
  for (const c of data ?? []) {
    const chave = c.responsavel_id ?? "sem";
    const nome = c.responsavel_id ? ((c.responsavel as unknown as { nome?: string } | null)?.nome ?? "—") : "Sem responsável";
    const atual = mapa.get(chave) ?? { responsavel_id: c.responsavel_id, responsavel_nome: nome, quantidade: 0 };
    atual.quantidade += 1;
    mapa.set(chave, atual);
  }
  return [...mapa.values()].sort((a, b) => b.quantidade - a.quantidade);
}

// ---------------------------------------------------------------------------
// Proposta / orçamento
// ---------------------------------------------------------------------------

export async function obterRegraDesconto(): Promise<RegraDescontoLoja> {
  const supabase = await createClient();
  const [{ data: cfg }, { data: regras }] = await Promise.all([
    supabase.from("configuracoes_desconto").select("regra_ativa").maybeSingle(),
    supabase.from("regras_desconto").select("cargo, percentual_max"),
  ]);
  return { regraAtiva: cfg?.regra_ativa === true, limitesPorCargo: Object.fromEntries((regras ?? []).map((r) => [r.cargo, Number(r.percentual_max)])) };
}

export interface ItemParaProposta { tipo: "aparelho" | "produto"; id: string; descricao: string; preco: number }

export async function buscarItemParaProposta(tipo: "aparelho" | "produto", id: string): Promise<ItemParaProposta> {
  const supabase = await createClient();
  if (tipo === "aparelho") {
    const { data: a, error } = await supabase.from("vw_aparelhos_seguro").select("id, produto_id, cor, memoria, condicao, preco_venda, status").eq("id", id).maybeSingle();
    if (error || !a) throw new Error("Aparelho não encontrado.");
    if (a.status !== "disponivel") throw new Error("Este aparelho não está mais disponível.");
    if (!a.preco_venda || a.preco_venda <= 0) throw new Error("Este aparelho está sem preço de venda cadastrado.");
    const { data: p } = await supabase.from("produtos").select("nome").eq("id", a.produto_id).maybeSingle();
    return { tipo, id, preco: Number(a.preco_venda), descricao: [p?.nome ?? "Aparelho", a.memoria, a.cor, a.condicao].filter(Boolean).join(" · ") };
  }
  const { data: p, error } = await supabase.from("produtos").select("id, nome, preco_venda").eq("id", id).maybeSingle();
  if (error || !p) throw new Error("Produto não encontrado.");
  if (!p.preco_venda || p.preco_venda <= 0) throw new Error("Este produto está sem preço de venda cadastrado.");
  return { tipo, id, preco: Number(p.preco_venda), descricao: p.nome };
}

export interface ResultadoProposta {
  item: ItemParaProposta;
  proposta: PropostaCalculada;
  avaliacaoDesconto: AvaliacaoDesconto;
  texto: string;
  /** Somente admin/gerente. null para os demais — e sequer é calculado para eles. */
  resultadoEstimado: { custo: number; resultado: number } | null;
}

export async function simularProposta(params: { tipo: "aparelho" | "produto"; itemId: string; desconto: number; tradeInId?: string | null; clienteNome?: string | null; cargo: string }): Promise<ResultadoProposta> {
  const [item, engine, regra] = await Promise.all([buscarItemParaProposta(params.tipo, params.itemId), obterPricingEngine(), obterRegraDesconto()]);

  let tradeInValor = 0;
  if (params.tradeInId) {
    const av = await obterAvaliacao(params.tradeInId);
    if (!av) throw new Error("Avaliação de trade-in não encontrada.");
    if (av.status !== "aprovado") throw new Error("Só uma avaliação de trade-in já aprovada pela equipe pode entrar na proposta.");
    tradeInValor = av.valor_aprovado ?? av.valor_calculado;
  }

  const avaliacaoDesconto = avaliarDesconto({ cargo: params.cargo, valorBruto: item.preco, desconto: params.desconto, regra });
  if (avaliacaoDesconto.situacao === "invalido") throw new Error(avaliacaoDesconto.motivo);
  const proposta = calcularProposta(engine, { precoTabela: item.preco, desconto: params.desconto, tradeInValor });

  let resultadoEstimado: ResultadoProposta["resultadoEstimado"] = null;
  if (params.cargo === "admin" || params.cargo === "gerente") {
    const custo = await obterCustoItem(item.tipo === "aparelho" ? { aparelhoId: item.id } : { produtoId: item.id });
    resultadoEstimado = { custo, resultado: Math.round((proposta.baseLiquida - custo) * 100) / 100 };
  }

  return { item, proposta, avaliacaoDesconto, texto: textoDaProposta({ descricao: item.descricao, proposta, nomeCliente: params.clienteNome }), resultadoEstimado };
}

export { tentar };
