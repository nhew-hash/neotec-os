import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { avaliarTradeIn, type ModeloTradeIn, type ConfigTradeIn, type OpcoesAvaliacao, type ResultadoAvaliacaoTradeIn } from "./motor";

type Admin = ReturnType<typeof createAdminClient>;
type SessionClient = Awaited<ReturnType<typeof createClient>>;
type AnyClient = Admin | SessionClient;

export type OrigemAvaliacao = "site" | "neotec_os" | "bot";
export type StatusAvaliacaoTradeIn =
  | "estimativa"
  | "aguardando_avaliacao"
  | "em_avaliacao"
  | "aprovado"
  | "recusado"
  | "convertido_venda"
  | "convertido_estoque"
  | "cancelado";

export interface TrocaAvaria {
  codigo: string;
  nome: string;
  descricao: string | null;
  ordem: number;
  bloqueia: boolean;
  ativo: boolean;
  personalizada: boolean;
}

export interface TrocaModelo {
  id: string;
  nome: string;
  familia: string;
  marca: string;
  ordem: number;
  valor_troca: number;
  ativo: boolean;
  observacoes: string | null;
}

export interface TrocaModeloComAvarias extends TrocaModelo {
  avarias: { avaria_codigo: string; desconto: number }[];
}

export interface AvaliacaoTradeIn {
  id: string;
  created_at: string;
  origem: OrigemAvaliacao;
  cliente_id: string | null;
  cliente_nome: string | null;
  cliente_telefone: string | null;
  modelo_id: string | null;
  modelo_nome: string;
  valor_base: number;
  avarias_marcadas: { codigo: string; nome: string; desconto: number }[];
  checklist_respostas: Record<string, "ok" | "reprovado">;
  bateria_saude: number | null;
  imei: string | null;
  total_descontos: number;
  bonus_valor: number;
  valor_calculado: number;
  valor_aprovado: number | null;
  valor_alterado_motivo: string | null;
  bloqueado: boolean;
  motivos_bloqueio: string[];
  fotos: { tipo: string; url: string }[];
  observacoes: string | null;
  status: StatusAvaliacaoTradeIn;
  venda_id: string | null;
  aparelho_id: string | null;
  usuario_id: string | null;
  aprovado_por: string | null;
  aprovado_em: string | null;
  pagamento_antecipado_pedido_produto_id: string | null;
  pagamento_antecipado_pedido_estorno_id: string | null;
  pagamento_antecipado_estornado: boolean;
  pagamento_antecipado_estornado_em: string | null;
}

/** Resultado de uma avaliação quando o modelo não está cadastrado — nunca inventamos valor. */
export interface AvaliacaoNaoEncontrada {
  encontrado: false;
  mensagem: string;
}

export interface AvaliacaoEncontrada {
  encontrado: true;
  modelo: TrocaModelo;
  resultado: ResultadoAvaliacaoTradeIn;
}

const MENSAGEM_AVALIACAO_MANUAL = "Esse aparelho precisa de uma avaliação da equipe para informarmos o valor.";

// ---------------------------------------------------------------------------
// Catálogo (avarias, modelos, config) — admin edita, motor consome.
// ---------------------------------------------------------------------------

export async function listarAvariasCatalogo(cliente?: AnyClient): Promise<TrocaAvaria[]> {
  const supabase = cliente ?? (await createClient());
  const { data, error } = await supabase.from("troca_avarias").select("*").order("ordem");
  if (error) throw new Error(`Não foi possível carregar o catálogo de avarias: ${error.message}`);
  return data ?? [];
}

export async function listarModelosTradeIn(opcoes?: { somenteAtivos?: boolean }): Promise<TrocaModeloComAvarias[]> {
  const supabase = await createClient();
  let query = supabase.from("troca_modelos").select("*").order("familia").order("ordem");
  if (opcoes?.somenteAtivos) query = query.eq("ativo", true);
  const [{ data: modelos, error }, { data: avarias }] = await Promise.all([
    query,
    supabase.from("troca_modelo_avarias").select("modelo_id, avaria_codigo, desconto"),
  ]);
  if (error) throw new Error(`Não foi possível carregar os modelos: ${error.message}`);

  return (modelos ?? []).map((m) => ({
    ...m,
    avarias: (avarias ?? []).filter((a) => a.modelo_id === m.id).map((a) => ({ avaria_codigo: a.avaria_codigo, desconto: a.desconto })),
  }));
}

async function buscarModeloComAvariasPorId(admin: AnyClient, modeloId: string): Promise<TrocaModeloComAvarias | null> {
  const [{ data: modelo }, { data: avarias }] = await Promise.all([
    admin.from("troca_modelos").select("*").eq("id", modeloId).maybeSingle(),
    admin.from("troca_modelo_avarias").select("avaria_codigo, desconto").eq("modelo_id", modeloId),
  ]);
  if (!modelo) return null;
  return { ...modelo, avarias: (avarias ?? []).map((a) => ({ avaria_codigo: a.avaria_codigo, desconto: a.desconto })) };
}

/** Busca por nome exato, usada pelo bot (que recebe o modelo como texto livre já resolvido) e pelo autocomplete do site. */
export async function buscarModelosTradeInPorTermo(termo: string, cliente?: AnyClient): Promise<TrocaModelo[]> {
  const admin = cliente ?? createAdminClient();
  const { data, error } = await admin
    .from("troca_modelos")
    .select("id, nome, familia, marca, ordem, valor_troca, ativo, observacoes")
    .eq("ativo", true)
    .ilike("nome", `%${termo.trim()}%`)
    .order("ordem")
    .limit(15);
  if (error) throw new Error(`Não foi possível buscar modelos: ${error.message}`);
  return data ?? [];
}

/** Marcas com pelo menos um modelo ativo — primeiro passo do wizard do site. */
export async function listarMarcasTradeIn(cliente?: AnyClient): Promise<string[]> {
  const admin = cliente ?? createAdminClient();
  const { data, error } = await admin.from("troca_modelos").select("marca").eq("ativo", true);
  if (error) throw new Error(`Não foi possível carregar as marcas: ${error.message}`);
  return [...new Set((data ?? []).map((d) => d.marca))].sort();
}

/** Famílias (ex: "iPhone 13") de uma marca — segundo passo do wizard. */
export async function listarFamiliasTradeIn(marca: string, cliente?: AnyClient): Promise<string[]> {
  const admin = cliente ?? createAdminClient();
  const { data, error } = await admin.from("troca_modelos").select("familia, ordem").eq("ativo", true).eq("marca", marca).order("ordem");
  if (error) throw new Error(`Não foi possível carregar os modelos: ${error.message}`);
  return [...new Set((data ?? []).map((d) => d.familia))];
}

/** Variantes (nome completo, ex: "iPhone 13 128GB") de uma família — terceiro passo do wizard (funciona como o "armazenamento"). */
export async function listarVariantesTradeIn(familia: string, cliente?: AnyClient): Promise<{ id: string; nome: string }[]> {
  const admin = cliente ?? createAdminClient();
  const { data, error } = await admin.from("troca_modelos").select("id, nome").eq("ativo", true).eq("familia", familia).order("ordem");
  if (error) throw new Error(`Não foi possível carregar as variantes: ${error.message}`);
  return data ?? [];
}

export async function obterConfigTradeIn(cliente?: AnyClient): Promise<ConfigTradeIn & { regrasTexto: string }> {
  const admin = cliente ?? createAdminClient();
  const { data, error } = await admin.from("troca_config").select("*").eq("id", 1).single();
  if (error) throw new Error(`Não foi possível carregar a configuração de troca: ${error.message}`);
  return { bateriaCorte: data.bateria_corte, bonusSeminovo: data.bonus_seminovo, regrasTexto: data.regras_texto };
}

function montarModeloParaMotor(modelo: TrocaModeloComAvarias, catalogoAvarias: TrocaAvaria[]): ModeloTradeIn {
  const catalogoPorCodigo = new Map(catalogoAvarias.map((a) => [a.codigo, a]));
  return {
    id: modelo.id,
    nome: modelo.nome,
    valorTroca: modelo.valor_troca,
    avariasDisponiveis: modelo.avarias
      .map((ma) => {
        const info = catalogoPorCodigo.get(ma.avaria_codigo);
        if (!info) return null;
        return { codigo: ma.avaria_codigo, nome: info.nome, desconto: ma.desconto, bloqueia: info.bloqueia };
      })
      .filter((a): a is NonNullable<typeof a> => a !== null),
  };
}

/**
 * Ponto único de cálculo, usado por site/Neotec OS/bot — resolve modelo +
 * config no banco e chama o motor puro. Se o modelo não existir ou estiver
 * inativo, retorna `encontrado: false` com a mensagem de avaliação manual —
 * NUNCA chama o motor com um valor inventado.
 */
export async function avaliarPorModeloId(
  modeloId: string,
  opcoes: OpcoesAvaliacao,
  cliente?: AnyClient,
): Promise<AvaliacaoNaoEncontrada | AvaliacaoEncontrada> {
  const admin = cliente ?? createAdminClient();
  const [modelo, catalogo, config] = await Promise.all([
    buscarModeloComAvariasPorId(admin, modeloId),
    listarAvariasCatalogo(admin),
    obterConfigTradeIn(admin),
  ]);
  if (!modelo || !modelo.ativo) return { encontrado: false, mensagem: MENSAGEM_AVALIACAO_MANUAL };

  const modeloMotor = montarModeloParaMotor(modelo, catalogo);
  const resultado = avaliarTradeIn(modeloMotor, config, opcoes);
  return { encontrado: true, modelo: modelo, resultado };
}

export async function avaliarPorNomeModelo(
  nomeModelo: string,
  opcoes: OpcoesAvaliacao,
): Promise<AvaliacaoNaoEncontrada | AvaliacaoEncontrada> {
  const admin = createAdminClient();
  const { data: modelo } = await admin.from("troca_modelos").select("id").eq("nome", nomeModelo).eq("ativo", true).maybeSingle();
  if (!modelo) return { encontrado: false, mensagem: MENSAGEM_AVALIACAO_MANUAL };
  return avaliarPorModeloId(modelo.id, opcoes, admin);
}

// ---------------------------------------------------------------------------
// Avaliações — criação, consulta, aprovação/reprovação, alteração manual.
// ---------------------------------------------------------------------------

function linhaParaAvaliacao(row: Record<string, unknown>): AvaliacaoTradeIn {
  return row as unknown as AvaliacaoTradeIn;
}

export interface CriarAvaliacaoInput {
  origem: OrigemAvaliacao;
  modeloId: string;
  avariasMarcadas: string[];
  bateriaSaude?: number | null;
  checklistRespostas?: Record<string, "ok" | "reprovado">;
  clienteId?: string | null;
  clienteNome?: string | null;
  clienteTelefone?: string | null;
  imei?: string | null;
  observacoes?: string | null;
  fotos?: { tipo: string; url: string }[];
  usuarioId?: string | null;
  /** Origem "site"/"bot" resulta em status 'estimativa'; "neotec_os" resulta em 'em_avaliacao' (staff decide depois). */
}

export async function criarAvaliacao(input: CriarAvaliacaoInput): Promise<{ avaliacao: AvaliacaoTradeIn; resultado: ResultadoAvaliacaoTradeIn } | { encontrado: false; mensagem: string }> {
  const admin = createAdminClient();
  const avaliacaoBusca = await avaliarPorModeloId(input.modeloId, { avariasMarcadas: input.avariasMarcadas, bateriaSaude: input.bateriaSaude ?? null }, admin);
  if (!avaliacaoBusca.encontrado) return avaliacaoBusca;

  const { modelo, resultado } = avaliacaoBusca;
  const status: StatusAvaliacaoTradeIn = input.origem === "neotec_os" ? "em_avaliacao" : "estimativa";

  const avariasMarcadasSnapshot = resultado.ajustes.map((a) => ({ codigo: a.codigo, nome: a.nome, desconto: a.desconto }));

  const { data, error } = await admin
    .from("avaliacoes_trade_in")
    .insert({
      origem: input.origem,
      cliente_id: input.clienteId ?? null,
      cliente_nome: input.clienteNome ?? null,
      cliente_telefone: input.clienteTelefone ?? null,
      modelo_id: modelo.id,
      modelo_nome: modelo.nome,
      valor_base: resultado.valorBase,
      avarias_marcadas: avariasMarcadasSnapshot,
      checklist_respostas: input.checklistRespostas ?? {},
      bateria_saude: input.bateriaSaude ?? null,
      imei: input.imei ?? null,
      total_descontos: resultado.totalDescontos,
      bonus_valor: resultado.bonus,
      valor_calculado: resultado.valorFinal,
      bloqueado: resultado.bloqueado,
      motivos_bloqueio: resultado.motivos,
      fotos: input.fotos ?? [],
      observacoes: input.observacoes ?? null,
      status,
      usuario_id: input.usuarioId ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(`Não foi possível registrar a avaliação: ${error.message}`);

  return { avaliacao: linhaParaAvaliacao(data), resultado };
}

/**
 * Marca uma avaliação do site como "aguardando avaliação" (aparelho a
 * caminho da loja) — usado pela opção "Enviar o aparelho pra avaliação"
 * do wizard. Sem sessão de staff (chamada do site), por isso usa o
 * admin client; a CHECK `chk_avaliacao_site_nasce_estimativa` garante
 * que isso nunca pula direto pra aprovado/convertido mesmo se alguém
 * tentar forçar.
 */
export async function marcarAguardandoAvaliacao(id: string, dados?: { clienteNome?: string; clienteTelefone?: string }): Promise<AvaliacaoTradeIn> {
  const admin = createAdminClient();
  const atual = await obterAvaliacao(id, admin);
  if (!atual) throw new Error("Avaliação não encontrada");
  if (atual.origem !== "site") throw new Error("Esse fluxo é só pra avaliações feitas no site");
  if (!["estimativa", "aguardando_avaliacao"].includes(atual.status)) throw new Error("Essa avaliação já está em outro estágio e não pode voltar pra 'aguardando avaliação'");

  const { data, error } = await admin
    .from("avaliacoes_trade_in")
    .update({
      status: "aguardando_avaliacao",
      cliente_nome: dados?.clienteNome || atual.cliente_nome,
      cliente_telefone: dados?.clienteTelefone || atual.cliente_telefone,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(`Não foi possível registrar o envio do aparelho: ${error.message}`);
  return linhaParaAvaliacao(data);
}

/**
 * Confirma que os DOIS pagamentos do "pagamento antecipado" (produto
 * com desconto + valor do aparelho, a ser estornado) foram feitos de
 * verdade no checkout — liga os dois pedidos à avaliação e muda o
 * status pra 'aguardando_avaliacao' (o aparelho ainda precisa chegar
 * na loja pra avaliação física acontecer). O estorno em si é sempre
 * manual, feito pelo dono direto no Mercado Pago — aqui só fica
 * registrado qual pedido é esse, pra não se perder de vista.
 */
export async function confirmarPagamentoAntecipadoTroca(input: {
  avaliacaoId: string;
  pedidoProdutoId: string;
  pedidoEstornoId: string;
}): Promise<AvaliacaoTradeIn> {
  const admin = createAdminClient();
  const atual = await obterAvaliacao(input.avaliacaoId, admin);
  if (!atual) throw new Error("Avaliação não encontrada");
  if (atual.origem !== "site") throw new Error("Esse fluxo é só pra avaliações feitas no site");

  const { data, error } = await admin
    .from("avaliacoes_trade_in")
    .update({
      status: "aguardando_avaliacao",
      pagamento_antecipado_pedido_produto_id: input.pedidoProdutoId,
      pagamento_antecipado_pedido_estorno_id: input.pedidoEstornoId,
    })
    .eq("id", input.avaliacaoId)
    .select("*")
    .single();
  if (error) throw new Error(`Pagamento confirmado, mas não foi possível vincular à avaliação: ${error.message}`);
  return linhaParaAvaliacao(data);
}

/** Staff marca que já processou o estorno manual no Mercado Pago — fecha o ciclo do "pagamento antecipado" na tela da avaliação. */
export async function marcarEstornoTradeInFeito(avaliacaoId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("avaliacoes_trade_in")
    .update({ pagamento_antecipado_estornado: true, pagamento_antecipado_estornado_em: new Date().toISOString() })
    .eq("id", avaliacaoId);
  if (error) throw new Error(`Não foi possível marcar o estorno: ${error.message}`);
}

export async function listarAvaliacoes(filtros?: { status?: StatusAvaliacaoTradeIn; clienteId?: string }): Promise<AvaliacaoTradeIn[]> {
  const supabase = await createClient();
  let query = supabase.from("avaliacoes_trade_in").select("*").order("created_at", { ascending: false });
  if (filtros?.status) query = query.eq("status", filtros.status);
  if (filtros?.clienteId) query = query.eq("cliente_id", filtros.clienteId);
  const { data, error } = await query;
  if (error) throw new Error(`Não foi possível carregar as avaliações: ${error.message}`);
  return (data ?? []).map(linhaParaAvaliacao);
}

export async function obterAvaliacao(id: string, cliente?: AnyClient): Promise<AvaliacaoTradeIn | null> {
  const supabase = cliente ?? (await createClient());
  const { data, error } = await supabase.from("avaliacoes_trade_in").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Não foi possível carregar a avaliação: ${error.message}`);
  return data ? linhaParaAvaliacao(data) : null;
}

/**
 * Staff assume uma estimativa/solicitação pra fazer o checklist físico
 * (muda pra 'em_avaliacao') ou recalcula direto com o checklist real.
 */
export async function iniciarAvaliacaoFisica(id: string, usuarioId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("avaliacoes_trade_in").update({ status: "em_avaliacao", usuario_id: usuarioId }).eq("id", id);
  if (error) throw new Error(`Não foi possível iniciar a avaliação: ${error.message}`);
}

export interface AprovarAvaliacaoInput {
  id: string;
  usuarioId: string;
  /** Quando omitido, aprova pelo valor_calculado (sem alteração manual). */
  valorAprovado?: number;
  motivoAlteracao?: string;
}

/** Aprova a avaliação. Se o valor aprovado divergir do calculado, exige motivo e registra na auditoria. */
export async function aprovarAvaliacao(input: AprovarAvaliacaoInput): Promise<AvaliacaoTradeIn> {
  const supabase = await createClient();
  const atual = await obterAvaliacao(input.id, supabase);
  if (!atual) throw new Error("Avaliação não encontrada");
  if (atual.bloqueado) throw new Error("Essa avaliação está bloqueada por uma avaria crítica — não pode ser aprovada sem revisão manual do valor.");

  const valorFinal = input.valorAprovado ?? atual.valor_calculado;
  const divergiu = Math.abs(valorFinal - atual.valor_calculado) >= 0.005;
  if (divergiu && !input.motivoAlteracao?.trim()) {
    throw new Error("Alterar o valor calculado exige o motivo da alteração.");
  }

  const { data, error } = await supabase
    .from("avaliacoes_trade_in")
    .update({
      status: "aprovado",
      valor_aprovado: valorFinal,
      valor_alterado_motivo: divergiu ? input.motivoAlteracao!.trim() : null,
      aprovado_por: input.usuarioId,
      aprovado_em: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select("*")
    .single();
  if (error) throw new Error(`Não foi possível aprovar: ${error.message}`);

  if (divergiu) {
    const { error: erroAuditoria } = await supabase.from("avaliacoes_trade_in_alteracoes").insert({
      avaliacao_id: input.id,
      usuario_id: input.usuarioId,
      valor_anterior: atual.valor_calculado,
      valor_novo: valorFinal,
      motivo: input.motivoAlteracao!.trim(),
    });
    if (erroAuditoria) throw new Error(`Aprovado, mas falhou ao registrar a auditoria da alteração: ${erroAuditoria.message}`);
  }

  return linhaParaAvaliacao(data);
}

export async function reprovarAvaliacao(id: string, usuarioId: string, motivo?: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("avaliacoes_trade_in")
    .update({ status: "recusado", aprovado_por: usuarioId, aprovado_em: new Date().toISOString(), observacoes: motivo ?? null })
    .eq("id", id);
  if (error) throw new Error(`Não foi possível recusar: ${error.message}`);
}

export async function cancelarAvaliacao(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("avaliacoes_trade_in").update({ status: "cancelado" }).eq("id", id);
  if (error) throw new Error(`Não foi possível cancelar: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Admin — tabela de valores (troca_modelos / troca_modelo_avarias / config).
// ---------------------------------------------------------------------------

export interface SalvarModeloInput {
  id?: string;
  nome: string;
  familia: string;
  marca?: string;
  ordem?: number;
  valorTroca: number;
  ativo?: boolean;
  observacoes?: string | null;
  avarias: { avariaCodigo: string; desconto: number }[];
}

export async function salvarModeloTradeIn(input: SalvarModeloInput): Promise<TrocaModelo> {
  const supabase = await createClient();
  const payload = {
    nome: input.nome.trim(),
    familia: input.familia.trim(),
    marca: input.marca?.trim() || "Apple",
    ordem: input.ordem ?? 0,
    valor_troca: input.valorTroca,
    ativo: input.ativo ?? true,
    observacoes: input.observacoes ?? null,
  };

  const { data: modelo, error } = input.id
    ? await supabase.from("troca_modelos").update(payload).eq("id", input.id).select("*").single()
    : await supabase.from("troca_modelos").insert(payload).select("*").single();
  if (error) throw new Error(`Não foi possível salvar o modelo: ${error.message}`);

  await supabase.from("troca_modelo_avarias").delete().eq("modelo_id", modelo.id);
  if (input.avarias.length) {
    const { error: erroAvarias } = await supabase
      .from("troca_modelo_avarias")
      .insert(input.avarias.map((a) => ({ modelo_id: modelo.id, avaria_codigo: a.avariaCodigo, desconto: a.desconto })));
    if (erroAvarias) throw new Error(`Modelo salvo, mas falhou ao salvar os descontos por avaria: ${erroAvarias.message}`);
  }

  return modelo;
}

export async function duplicarModeloTradeIn(id: string): Promise<TrocaModelo> {
  const supabase = await createClient();
  const original = await buscarModeloComAvariasPorId(supabase, id);
  if (!original) throw new Error("Modelo não encontrado");
  return salvarModeloTradeIn({
    nome: `${original.nome} (cópia)`,
    familia: original.familia,
    marca: original.marca,
    ordem: original.ordem,
    valorTroca: original.valor_troca,
    ativo: false,
    observacoes: original.observacoes,
    avarias: original.avarias.map((a) => ({ avariaCodigo: a.avaria_codigo, desconto: a.desconto })),
  });
}

export async function desativarModeloTradeIn(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("troca_modelos").update({ ativo: false }).eq("id", id);
  if (error) throw new Error(`Não foi possível desativar: ${error.message}`);
}

export async function salvarConfigTradeIn(input: { bateriaCorte: number; bonusSeminovo: number; regrasTexto: string }): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("troca_config")
    .update({ bateria_corte: input.bateriaCorte, bonus_seminovo: input.bonusSeminovo, regras_texto: input.regrasTexto })
    .eq("id", 1);
  if (error) throw new Error(`Não foi possível salvar a configuração: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Conversão para estoque — depois do aparelho aprovado ser recebido.
// ---------------------------------------------------------------------------

export interface ConverterEmEstoqueInput {
  avaliacaoId: string;
  imei: string;
  categoria: "iphone" | "android" | "ipad" | "mac" | "acessorio";
  cor?: string;
  memoria?: string;
  precoVenda?: number;
}

/**
 * Cria (ou reaproveita, se já existir) o produto/modelo no catálogo de
 * estoque e cadastra o aparelho físico recebido na troca — mesmo padrão
 * de busca-ou-cria já usado no cadastro rápido do PDV
 * (`criarAparelhoRapidoVendaAction`), pra nunca duplicar um modelo que
 * já existe no catálogo. Só funciona pra avaliação já 'aprovado' —
 * estimativa nunca vira estoque sozinha.
 */
export async function converterAvaliacaoEmEstoque(input: ConverterEmEstoqueInput): Promise<{ aparelhoId: string }> {
  const supabase = await createClient();

  const avaliacao = await obterAvaliacao(input.avaliacaoId, supabase);
  if (!avaliacao) throw new Error("Avaliação não encontrada");
  if (avaliacao.status !== "aprovado") throw new Error("Só uma avaliação aprovada pode virar item de estoque");
  if (avaliacao.aparelho_id) throw new Error("Essa avaliação já foi convertida em estoque");

  const custoAquisicao = avaliacao.valor_aprovado ?? avaliacao.valor_calculado;

  const { data: produtoExistente } = await supabase.from("produtos").select("id").ilike("nome", avaliacao.modelo_nome).maybeSingle();

  let produtoId: string;
  if (produtoExistente) {
    produtoId = produtoExistente.id;
  } else {
    const { data: novoProduto, error: erroProduto } = await supabase
      .from("produtos")
      .insert({ nome: avaliacao.modelo_nome, categoria: input.categoria })
      .select("id")
      .single();
    if (erroProduto) throw new Error(`Não foi possível criar o produto no catálogo: ${erroProduto.message}`);
    produtoId = novoProduto.id;
  }

  const { data: aparelho, error: erroAparelho } = await supabase
    .from("aparelhos")
    .insert({
      produto_id: produtoId,
      imei: input.imei.trim(),
      cor: input.cor || null,
      memoria: input.memoria || null,
      bateria: avaliacao.bateria_saude ?? null,
      condicao: "seminovo",
      custo: custoAquisicao,
      preco_venda: input.precoVenda ?? null,
      origem_entrada: "troca",
      observacoes: `Recebido por trade-in — avaliação #${avaliacao.id.slice(0, 8)}${avaliacao.cliente_nome ? ` — cliente ${avaliacao.cliente_nome}` : ""}.`,
    })
    .select("id")
    .single();
  if (erroAparelho) throw new Error(`Não foi possível cadastrar o aparelho: ${erroAparelho.message}`);

  const { error: erroUpdate } = await supabase
    .from("avaliacoes_trade_in")
    .update({ status: "convertido_estoque", aparelho_id: aparelho.id })
    .eq("id", input.avaliacaoId);
  if (erroUpdate) throw new Error(`Aparelho cadastrado, mas falhou ao vincular à avaliação: ${erroUpdate.message}`);

  return { aparelhoId: aparelho.id };
}

export async function listarHistoricoAlteracoes(avaliacaoId: string): Promise<{ id: string; usuario_id: string | null; valor_anterior: number; valor_novo: number; motivo: string; created_at: string }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("avaliacoes_trade_in_alteracoes")
    .select("*")
    .eq("avaliacao_id", avaliacaoId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Não foi possível carregar o histórico: ${error.message}`);
  return data ?? [];
}
