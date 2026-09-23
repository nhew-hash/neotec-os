import type { SupabaseClient } from "@supabase/supabase-js";
import type { ItemExtraido } from "./tipos";
import type { ItemFlagado } from "./validacao";
import {
  chaveIdentidade,
  calcularPlanoAplicacao,
  avaliarTravasDeSeguranca,
  type ItemArmazenado,
  type PlanoAplicacao,
} from "./aplicacao-diff";
import { calcularPrecoComRegra, type RegraLucroComFaixas } from "@/services/seminovos/regras-lucro.service";

/**
 * Camada que fala com o banco — a peça que faltava depois do motor puro
 * (classificador/parsers/validação/diff, Fase 230). Ver nota de design
 * em `supabase/migrations/fase234_import_itens_ativos.sql`: o "estado
 * ativo anterior" que o diff compara mora em `import_itens_ativos`
 * (fonte de verdade do escopo fornecedor+tipo_lista); aparelhos/
 * catalogo_lacrados_variantes/produtos são uma PROJEÇÃO derivada dela,
 * pro que o cliente/staff efetivamente vê.
 */

type Admin = SupabaseClient;

function gerarSlug(nome: string): string {
  return nome
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * `produtos.categoria` é um enum de fato (5 valores fixos usados pela
 * navegação/filtros da loja pública — ver src/components/loja/categorias.ts).
 * A taxonomia nova (`categoria_slug`, 17 folhas) é bem mais fina — mapeia
 * pro balde certo quando existe um específico, senão cai em "acessorio"
 * (catch-all já usado hoje pra tudo que não é iPhone/iPad/Mac/Watch).
 * `categoria_id` (FK nova) carrega a fidelidade completa; isso aqui só
 * existe pra loja pública continuar filtrando sem quebrar nada.
 */
function categoriaSlugParaCategoriaLoja(slug: string): "iphone" | "apple_watch" | "ipad" | "mac" | "acessorio" {
  switch (slug) {
    case "smartphones_iphone": return "iphone";
    case "smartwatches_apple_watch": return "apple_watch";
    case "tablets_ipad": return "ipad";
    case "computadores_macbook": return "mac";
    default: return "acessorio";
  }
}

type Destino = "seminovo" | "lacrado" | "generico";

function resolverDestino(item: ItemExtraido): Destino {
  if (item.condicao === "Seminovo") return "seminovo";
  if (item.condicao === "Lacrado") return "lacrado";
  return "generico";
}

// ============================================================================
// Leitura do estado ativo anterior (escopo fornecedor + tipo_lista)
// ============================================================================

interface LinhaItemAtivo {
  id: string;
  categoria_slug: string;
  marca: string | null;
  modelo_canonico: string;
  modelo_reconhecido: boolean;
  condicao: string | null;
  armazenamento_gb: number | null;
  ram_gb: number | null;
  ram_possivel_typo: boolean;
  conectividade: string | null;
  nfc: boolean;
  tamanho_mm: number | null;
  gps_cellular: string | null;
  cor: string;
  cor_base: string;
  cor_emoji_origem: string | null;
  bateria_pct: number | null;
  cidade: string | null;
  garantia: string | null;
  quantidade: number;
  tags: string[];
  fornecedor: string;
  tipo_lista: string;
  preco_fornecedor: number;
  linha_origem: string | null;
  aparelho_ids: string[];
  variante_lacrado_id: string | null;
  produto_id: string | null;
}

function linhaParaItemArmazenado(linha: LinhaItemAtivo): ItemArmazenado {
  return {
    id: linha.id,
    categoriaSlug: linha.categoria_slug,
    marca: linha.marca ?? "",
    modeloCanonico: linha.modelo_canonico,
    modeloReconhecido: linha.modelo_reconhecido,
    condicao: linha.condicao as ItemExtraido["condicao"],
    armazenamentoGb: linha.armazenamento_gb,
    ramGb: linha.ram_gb,
    ramPossivelTypo: linha.ram_possivel_typo,
    conectividade: linha.conectividade as ItemExtraido["conectividade"],
    nfc: linha.nfc,
    tamanhoMm: linha.tamanho_mm,
    gpsCellular: linha.gps_cellular as ItemExtraido["gpsCellular"],
    cor: linha.cor,
    corBase: linha.cor_base,
    corEmojiOrigem: linha.cor_emoji_origem,
    bateriaPct: linha.bateria_pct,
    cidade: linha.cidade,
    garantia: linha.garantia,
    quantidade: linha.quantidade,
    tags: linha.tags,
    fornecedor: linha.fornecedor as ItemExtraido["fornecedor"],
    tipoLista: linha.tipo_lista as ItemExtraido["tipoLista"],
    precoFornecedor: linha.preco_fornecedor,
    linhaOrigem: linha.linha_origem ?? "",
  };
}

export async function carregarItensAtivos(admin: Admin, fornecedor: string, tipoLista: string): Promise<ItemArmazenado[]> {
  const { data, error } = await admin
    .from("import_itens_ativos")
    .select("*")
    .eq("fornecedor", fornecedor)
    .eq("tipo_lista", tipoLista)
    .eq("ativo", true);
  if (error) throw new Error(`Falha ao carregar itens ativos: ${error.message}`);
  return ((data ?? []) as LinhaItemAtivo[]).map(linhaParaItemArmazenado);
}

// ============================================================================
// Margem de lucro por destino
// ============================================================================

/**
 * Mesma lógica de `listarRegrasLucro()` (services/seminovos), só que via
 * client admin em vez de `createClient()` de sessão — esta rota é
 * chamada pelo Bridge (segredo compartilhado, sem cookie de usuário
 * logado), então não dá pra reaproveitar a função original direto.
 */
/** Fallback quando NENHUMA regra por categoria foi cadastrada ainda — o comportamento de sempre (regra global marcada "padrão", mesma usada no cadastro manual). */
async function calcularPrecoVendaSeminovoPadrao(admin: Admin, precoFornecedor: number): Promise<number> {
  const [{ data: regras }, { data: faixas }] = await Promise.all([
    admin.from("regras_lucro").select("*").order("created_at"),
    admin.from("regras_lucro_faixas").select("*").order("ordem"),
  ]);
  const regrasComFaixas: RegraLucroComFaixas[] = (regras ?? []).map((r) => ({
    ...r,
    faixas: (faixas ?? []).filter((f) => f.regra_id === r.id),
  }));
  const regraPadrao = regrasComFaixas.find((r) => r.padrao) ?? regrasComFaixas[0];
  if (!regraPadrao) return precoFornecedor;
  return calcularPrecoComRegra(precoFornecedor, regraPadrao).precoVenda;
}

async function buscarRegraLucroPorId(admin: Admin, id: string): Promise<RegraLucroComFaixas | null> {
  const [{ data: regra }, { data: faixas }] = await Promise.all([
    admin.from("regras_lucro").select("*").eq("id", id).maybeSingle(),
    admin.from("regras_lucro_faixas").select("*").eq("regra_id", id).order("ordem"),
  ]);
  if (!regra) return null;
  return { ...regra, faixas: faixas ?? [] };
}

interface MargemCategoria {
  categoria_slug: string;
  condicao: string;
  valor_fixo: number | null;
  percentual: number | null;
  regra_lucro_id: string | null;
}

/**
 * Acha a regra de `import_margem_categoria` mais específica pra este
 * item: categoria exata + condição exata > categoria exata + "qualquer
 * condição" > categoria-mãe + condição exata > categoria-mãe + "qualquer".
 * É assim que "iPhone lacrado" e "iPhone Seminovo até certo valor"
 * convivem na MESMA categoria (`smartphones_iphone`) com regras diferentes.
 */
async function buscarMargemCategoria(admin: Admin, categoriaSlug: string, condicao: string | null): Promise<MargemCategoria | null> {
  const { data: categoria } = await admin.from("import_categorias").select("slug, parent_id").eq("slug", categoriaSlug).maybeSingle();
  const slugsParaChecar = [categoriaSlug];
  if (categoria?.parent_id) {
    const { data: pai } = await admin.from("import_categorias").select("slug").eq("id", categoria.parent_id).maybeSingle();
    if (pai?.slug) slugsParaChecar.push(pai.slug);
  }

  const { data: candidatas } = await admin
    .from("import_margem_categoria")
    .select("categoria_slug, condicao, valor_fixo, percentual, regra_lucro_id")
    .in("categoria_slug", slugsParaChecar);
  if (!candidatas?.length) return null;

  const condicaoNormalizada = condicao ?? "";
  const pontuacao = (m: MargemCategoria) =>
    (m.categoria_slug === categoriaSlug ? 0 : 2) + (m.condicao === condicaoNormalizada ? 0 : 1);

  const validas = (candidatas as MargemCategoria[]).filter((m) => m.condicao === condicaoNormalizada || m.condicao === "");
  if (validas.length === 0) return null;
  return validas.sort((a, b) => pontuacao(a) - pontuacao(b))[0];
}

/**
 * Preço de venda de qualquer item da importação automática — primeiro
 * tenta a regra configurada por categoria+condição (Estoque > Importação
 * automática > Regras de lucro); se não tem nada configurado pra essa
 * combinação, cai no comportamento de sempre: seminovo usa a regra
 * global "padrão"; lacrado/genérico saem pelo preço do fornecedor
 * mesmo (staff ajusta na tela).
 */
async function calcularPrecoVenda(admin: Admin, item: ItemExtraido): Promise<number> {
  const margem = await buscarMargemCategoria(admin, item.categoriaSlug, item.condicao);

  if (margem?.regra_lucro_id) {
    const regra = await buscarRegraLucroPorId(admin, margem.regra_lucro_id);
    if (regra) return calcularPrecoComRegra(item.precoFornecedor, regra).precoVenda;
  }

  if (margem && (margem.valor_fixo || margem.percentual)) {
    let preco = item.precoFornecedor;
    if (margem.percentual) preco += preco * (Number(margem.percentual) / 100);
    if (margem.valor_fixo) preco += Number(margem.valor_fixo);
    return Math.round(preco * 100) / 100;
  }

  if (item.condicao === "Seminovo") return calcularPrecoVendaSeminovoPadrao(admin, item.precoFornecedor);
  return item.precoFornecedor;
}

// ============================================================================
// Projeção — criação/atualização/desativação nas tabelas visíveis
// ============================================================================

async function obterOuCriarProduto(admin: Admin, nome: string, categoriaSlug: string, categoriaIdParaFk: string | null, marca: string | null): Promise<{ id: string; jaExistia: boolean }> {
  const { data: existente } = await admin.from("produtos").select("id").eq("nome", nome).maybeSingle();
  if (existente) return { id: existente.id, jaExistia: true };

  const slug = gerarSlug(nome);
  const { data: novo, error } = await admin
    .from("produtos")
    .insert({
      nome,
      categoria: categoriaSlugParaCategoriaLoja(categoriaSlug),
      categoria_id: categoriaIdParaFk,
      marca,
      slug,
      visivel_loja: true,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Falha ao criar produto "${nome}": ${error.message}`);
  return { id: novo.id, jaExistia: false };
}

async function resolverCategoriaId(admin: Admin, categoriaSlug: string): Promise<string | null> {
  const { data } = await admin.from("import_categorias").select("id").eq("slug", categoriaSlug).maybeSingle();
  return data?.id ?? null;
}

/** Cria `item.quantidade` unidades em `aparelhos` (IMEI null — completado na chegada física, mesmo padrão já usado no cadastro manual desde a Fase 87). */
async function criarAparelhosSeminovo(admin: Admin, item: ItemExtraido, categoriaId: string | null): Promise<string[]> {
  const nomeProduto = item.modeloCanonico;
  const { id: produtoId } = await obterOuCriarProduto(admin, nomeProduto, item.categoriaSlug, categoriaId, item.marca || null);
  const precoVenda = await calcularPrecoVenda(admin, item);

  const memoria = item.armazenamentoGb ? `${item.armazenamentoGb}GB${item.ramGb ? ` (${item.ramGb}GB RAM)` : ""}` : null;
  const quantidade = Math.max(1, item.quantidade || 1);

  const linhas = Array.from({ length: quantidade }, () => ({
    produto_id: produtoId,
    imei: null,
    memoria,
    cor: item.cor,
    bateria: item.bateriaPct,
    condicao: "seminovo",
    custo: item.precoFornecedor,
    preco_venda: precoVenda,
    observacoes: item.cidade ? `Origem: ${item.cidade}` : null,
    origem_entrada: "fornecedor",
    fornecedor: item.fornecedor,
    categoria_id: categoriaId,
    tipo_lista_fornecedor: item.tipoLista,
    status: "disponivel",
    disponivel_loja_virtual: true,
    localizacao_estoque: "fornecedor",
  }));

  const { data, error } = await admin.from("aparelhos").insert(linhas).select("id");
  if (error) throw new Error(`Falha ao criar aparelho(s) seminovo "${nomeProduto}": ${error.message}`);
  return (data ?? []).map((a) => a.id);
}

async function atualizarPrecoAparelhosSeminovo(admin: Admin, aparelhoIds: string[], item: ItemExtraido): Promise<void> {
  if (aparelhoIds.length === 0) return;
  const precoVenda = await calcularPrecoVenda(admin, item);
  const { error } = await admin.from("aparelhos").update({ custo: item.precoFornecedor, preco_venda: precoVenda }).in("id", aparelhoIds).eq("status", "disponivel");
  if (error) throw new Error(`Falha ao atualizar preço dos aparelhos: ${error.message}`);
}

/** Nunca apaga nem mexe em unidade já reservada/vendida — só some da vitrine as que ainda estavam "disponivel" (mesmo escopo da Fase 91). */
async function desativarAparelhosSeminovo(admin: Admin, aparelhoIds: string[]): Promise<void> {
  if (aparelhoIds.length === 0) return;
  const { error } = await admin.from("aparelhos").update({ disponivel_loja_virtual: false }).in("id", aparelhoIds).eq("status", "disponivel");
  if (error) throw new Error(`Falha ao desativar aparelhos: ${error.message}`);
}

/** Lacrado: casa com `catalogo_lacrados_modelos`/`variantes` (Fase 66) — cria modelo/variante na hora se ainda não existirem. Preço/quantidade são "a oferta deste fornecedor+tipo_lista" (`import_lacrados_ofertas`, Fase 230); o preço público exibido é sempre o MENOR entre ofertas ativas, recalculado por `sincronizarOfertaLacrado`. */
async function obterOuCriarVarianteLacrado(admin: Admin, item: ItemExtraido): Promise<string> {
  const { data: modeloExistente } = await admin.from("catalogo_lacrados_modelos").select("id").eq("nome", item.modeloCanonico).maybeSingle();
  let modeloId = modeloExistente?.id as string | undefined;

  if (!modeloId) {
    const { data: novoModelo, error } = await admin
      .from("catalogo_lacrados_modelos")
      .insert({ nome: item.modeloCanonico, marca: item.marca || "Outra" })
      .select("id")
      .single();
    if (error) throw new Error(`Falha ao criar modelo de lacrado "${item.modeloCanonico}": ${error.message}`);
    modeloId = novoModelo.id;
  }

  const armazenamento = item.armazenamentoGb ? `${item.armazenamentoGb}GB` : "—";
  const { data: varianteExistente } = await admin
    .from("catalogo_lacrados_variantes")
    .select("id")
    .eq("modelo_id", modeloId)
    .eq("cor", item.cor)
    .eq("armazenamento", armazenamento)
    .maybeSingle();
  if (varianteExistente) return varianteExistente.id;

  const { data: novaVariante, error } = await admin
    .from("catalogo_lacrados_variantes")
    .insert({ modelo_id: modeloId, cor: item.cor, armazenamento, quantidade: 0 })
    .select("id")
    .single();
  if (error) throw new Error(`Falha ao criar variante de lacrado "${item.modeloCanonico} ${item.cor}": ${error.message}`);
  return novaVariante.id;
}

/** Recalcula preço/quantidade públicos da variante a partir das ofertas ATIVAS de todos os fornecedores (nunca escrito direto pela importação — ver nota da Fase 230). */
async function sincronizarOfertaLacrado(admin: Admin, varianteId: string): Promise<void> {
  const { data: ofertas } = await admin.from("import_lacrados_ofertas").select("preco, ativa").eq("variante_id", varianteId).eq("ativa", true);
  const ativas = ofertas ?? [];
  const quantidade = ativas.length; // 1 oferta ativa = "tem pelo menos 1 disponível" (fornecedor não informa quantidade real em estoque, só se está ofertando ou não)
  const precoVenda = ativas.length > 0 ? Math.min(...ativas.map((o) => Number(o.preco))) : null;
  const { error } = await admin.from("catalogo_lacrados_variantes").update({ quantidade, preco_venda: precoVenda }).eq("id", varianteId);
  if (error) throw new Error(`Falha ao sincronizar oferta de lacrado: ${error.message}`);
}

async function aplicarOfertaLacrado(admin: Admin, item: ItemExtraido, varianteId: string): Promise<void> {
  const precoVenda = await calcularPrecoVenda(admin, item);
  const { error } = await admin
    .from("import_lacrados_ofertas")
    .upsert(
      { variante_id: varianteId, fornecedor: item.fornecedor, tipo_lista: item.tipoLista, preco: precoVenda, ativa: true, atualizado_em: new Date().toISOString() },
      { onConflict: "variante_id,fornecedor,tipo_lista" }
    );
  if (error) throw new Error(`Falha ao registrar oferta de lacrado: ${error.message}`);
  await sincronizarOfertaLacrado(admin, varianteId);
}

async function desativarOfertaLacrado(admin: Admin, varianteId: string, fornecedor: string, tipoLista: string): Promise<void> {
  const { error } = await admin.from("import_lacrados_ofertas").update({ ativa: false }).eq("variante_id", varianteId).eq("fornecedor", fornecedor).eq("tipo_lista", tipoLista);
  if (error) throw new Error(`Falha ao desativar oferta de lacrado: ${error.message}`);
  await sincronizarOfertaLacrado(admin, varianteId);
}

/** Genérico (iPad/MacBook/Apple Watch/acessório/áudio/perfume/etc sem condição Lacrado/Seminovo) — 1 produto simples, preço direto. */
async function aplicarProdutoGenerico(admin: Admin, item: ItemExtraido, categoriaId: string | null): Promise<string> {
  const precoVenda = await calcularPrecoVenda(admin, item);
  const { data: existente } = await admin.from("produtos").select("id, slug").eq("nome", item.modeloCanonico).maybeSingle();

  if (existente) {
    const { error } = await admin
      .from("produtos")
      .update({ preco_venda: precoVenda, categoria_id: categoriaId, visivel_loja: true, slug: existente.slug ?? gerarSlug(item.modeloCanonico) })
      .eq("id", existente.id);
    if (error) throw new Error(`Falha ao atualizar produto genérico "${item.modeloCanonico}": ${error.message}`);
    return existente.id;
  }

  const { data: novo, error } = await admin
    .from("produtos")
    .insert({
      nome: item.modeloCanonico,
      categoria: categoriaSlugParaCategoriaLoja(item.categoriaSlug),
      categoria_id: categoriaId,
      marca: item.marca || null,
      preco_venda: precoVenda,
      slug: gerarSlug(item.modeloCanonico),
      visivel_loja: true,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Falha ao criar produto genérico "${item.modeloCanonico}": ${error.message}`);
  return novo.id;
}

async function desativarProdutoGenerico(admin: Admin, produtoId: string): Promise<void> {
  const { error } = await admin.from("produtos").update({ visivel_loja: false }).eq("id", produtoId);
  if (error) throw new Error(`Falha ao ocultar produto genérico: ${error.message}`);
}

// ============================================================================
// Orquestração — aplica o PlanoAplicacao já calculado (diff puro) no banco
// ============================================================================

export interface ResultadoAplicacaoLista {
  aplicado: boolean;
  bloqueado: boolean;
  motivosBloqueio: string[];
  /** Itens com variação de preço absurda — NÃO aplicados, ficam pendentes de revisão manual, mas não travam o resto da lista. */
  itensRetidos: PlanoAplicacao["atualizarPreco"];
  motivosRetencao: string[];
  plano: PlanoAplicacao;
  itensAtivosAnteriores: ItemArmazenado[];
}

export async function aplicarListaFornecedor(
  admin: Admin,
  fornecedor: string,
  tipoLista: string,
  itensValidos: ItemExtraido[],
  totalDescartados: number
): Promise<ResultadoAplicacaoLista> {
  const itensAtivosAnteriores = await carregarItensAtivos(admin, fornecedor, tipoLista);
  const plano = calcularPlanoAplicacao(itensValidos, itensAtivosAnteriores);
  const travas = avaliarTravasDeSeguranca(plano, itensAtivosAnteriores, {
    itensNovosValidos: itensValidos as (ItemExtraido | ItemFlagado)[],
    descartados: totalDescartados,
  });

  // Queda de volume, muitos descartes ou cor desconhecida = a lista
  // INTEIRA veio malformada — não aplica nada, espera revisão manual.
  if (travas.bloqueado) {
    return {
      aplicado: false,
      bloqueado: true,
      motivosBloqueio: travas.motivos,
      itensRetidos: travas.itensRetidos,
      motivosRetencao: travas.motivosRetencao,
      plano,
      itensAtivosAnteriores,
    };
  }

  // Variação de preço absurda é só daquele item — retém só ele, aplica
  // o resto do plano normalmente (não trava a lista, não trava as
  // próximas listas do mesmo fornecedor/tipo).
  const idsRetidos = new Set(travas.itensRetidos.map((r) => r.id));
  const atualizarPrecoAplicaveis = plano.atualizarPreco.filter((upd) => !idsRetidos.has(upd.id));

  for (const item of plano.inserir) {
    await inserirItemNovo(admin, item);
  }
  for (const upd of atualizarPrecoAplicaveis) {
    await atualizarPrecoItem(admin, upd.id, upd.item, upd.precoNovo);
  }
  for (const antigo of plano.desativar) {
    await desativarItem(admin, antigo);
  }
  for (const semMudanca of plano.semMudanca) {
    await reafirmarItemAtivo(admin, semMudanca);
  }

  return {
    aplicado: true,
    bloqueado: false,
    motivosBloqueio: [],
    itensRetidos: travas.itensRetidos,
    motivosRetencao: travas.motivosRetencao,
    plano: { ...plano, atualizarPreco: atualizarPrecoAplicaveis },
    itensAtivosAnteriores,
  };
}

async function inserirItemNovo(admin: Admin, item: ItemExtraido): Promise<void> {
  const categoriaId = await resolverCategoriaId(admin, item.categoriaSlug);
  const destino = resolverDestino(item);

  let aparelhoIds: string[] = [];
  let varianteLacradoId: string | null = null;
  let produtoId: string | null = null;

  if (destino === "seminovo") {
    aparelhoIds = await criarAparelhosSeminovo(admin, item, categoriaId);
  } else if (destino === "lacrado") {
    varianteLacradoId = await obterOuCriarVarianteLacrado(admin, item);
    await aplicarOfertaLacrado(admin, item, varianteLacradoId);
  } else {
    produtoId = await aplicarProdutoGenerico(admin, item, categoriaId);
  }

  const { error } = await admin.from("import_itens_ativos").insert({
    fornecedor: item.fornecedor,
    tipo_lista: item.tipoLista,
    chave_identidade: chaveIdentidade(item),
    categoria_slug: item.categoriaSlug,
    marca: item.marca || null,
    modelo_canonico: item.modeloCanonico,
    modelo_reconhecido: item.modeloReconhecido,
    condicao: item.condicao,
    armazenamento_gb: item.armazenamentoGb,
    ram_gb: item.ramGb,
    ram_possivel_typo: item.ramPossivelTypo,
    conectividade: item.conectividade,
    nfc: item.nfc,
    tamanho_mm: item.tamanhoMm,
    gps_cellular: item.gpsCellular,
    cor: item.cor,
    cor_base: item.corBase,
    cor_emoji_origem: item.corEmojiOrigem,
    bateria_pct: item.bateriaPct,
    cidade: item.cidade,
    garantia: item.garantia,
    quantidade: item.quantidade,
    tags: item.tags,
    preco_fornecedor: item.precoFornecedor,
    linha_origem: item.linhaOrigem,
    aparelho_ids: aparelhoIds,
    variante_lacrado_id: varianteLacradoId,
    produto_id: produtoId,
    ativo: true,
  });
  if (error) throw new Error(`Falha ao registrar item ativo "${item.modeloCanonico} ${item.cor}": ${error.message}`);
}

async function atualizarPrecoItem(admin: Admin, id: string, itemAntigo: ItemArmazenado, precoNovo: number): Promise<void> {
  const { data: linha, error: erroLeitura } = await admin.from("import_itens_ativos").select("aparelho_ids, variante_lacrado_id, produto_id").eq("id", id).single();
  if (erroLeitura) throw new Error(`Falha ao ler item ativo pra atualizar preço: ${erroLeitura.message}`);

  const itemComPrecoNovo: ItemExtraido = { ...itemAntigo, precoFornecedor: precoNovo } as ItemExtraido;

  if (linha.aparelho_ids?.length) {
    await atualizarPrecoAparelhosSeminovo(admin, linha.aparelho_ids, itemComPrecoNovo);
  } else if (linha.variante_lacrado_id) {
    await aplicarOfertaLacrado(admin, itemComPrecoNovo, linha.variante_lacrado_id);
  } else if (linha.produto_id) {
    const precoVenda = await calcularPrecoVenda(admin, itemComPrecoNovo);
    await admin.from("produtos").update({ preco_venda: precoVenda }).eq("id", linha.produto_id);
  }

  const { error } = await admin.from("import_itens_ativos").update({ preco_fornecedor: precoNovo }).eq("id", id);
  if (error) throw new Error(`Falha ao atualizar preço do item ativo: ${error.message}`);
}

async function desativarItem(admin: Admin, item: ItemArmazenado): Promise<void> {
  const { data: linha, error: erroLeitura } = await admin.from("import_itens_ativos").select("aparelho_ids, variante_lacrado_id, produto_id").eq("id", item.id).single();
  if (erroLeitura) throw new Error(`Falha ao ler item ativo pra desativar: ${erroLeitura.message}`);

  if (linha.aparelho_ids?.length) {
    await desativarAparelhosSeminovo(admin, linha.aparelho_ids);
  } else if (linha.variante_lacrado_id) {
    await desativarOfertaLacrado(admin, linha.variante_lacrado_id, item.fornecedor, item.tipoLista);
  } else if (linha.produto_id) {
    await desativarProdutoGenerico(admin, linha.produto_id);
  }

  const { error } = await admin.from("import_itens_ativos").update({ ativo: false, desativado_em: new Date().toISOString() }).eq("id", item.id);
  if (error) throw new Error(`Falha ao desativar item ativo: ${error.message}`);
}

/**
 * "Presença" — reafirma que um item de `semMudanca` (preço igual ao da
 * última lista) continua ativo/visível, mesmo sem nenhuma mudança de
 * preço pra disparar `atualizarPrecoItem`.
 *
 * Bug relatado pelo dono (23/09/2026): a importação só tocava no banco
 * quando um item era novo, mudava de preço, ou saía da lista — itens
 * "sem mudança" nunca eram reprocessados. Então quando algo por fora da
 * importação zerava a quantidade de uma variante de lacrado (uma
 * atualização em massa não rastreada) ou ocultava um produto
 * manualmente (`visivel_loja = false`), a importação seguinte não
 * corrigia isso de volta — pra ela, "nada mudou" naquele item, então
 * nada era escrito. O item ficava pra sempre fora do site mesmo com
 * `aplicado = true` em todas as listas seguintes, até o preço do
 * fornecedor mudar de novo.
 *
 * Reaplica a MESMA oferta/preço (não muda nada visível pro cliente),
 * só garante que o estado de "ativo no site" bate com "está na lista
 * mais recente do fornecedor".
 */
async function reafirmarItemAtivo(admin: Admin, item: ItemArmazenado): Promise<void> {
  const { data: linha, error: erroLeitura } = await admin
    .from("import_itens_ativos")
    .select("aparelho_ids, variante_lacrado_id, produto_id")
    .eq("id", item.id)
    .single();
  if (erroLeitura) throw new Error(`Falha ao ler item ativo pra reafirmar presença: ${erroLeitura.message}`);

  if (linha.variante_lacrado_id) {
    // Reaplica a oferta com o preço que já estava — re-ativa se algo
    // desativou por fora, e recalcula a quantidade a partir das ofertas
    // ativas de novo (é exatamente isso que zerava as 55 variantes).
    await aplicarOfertaLacrado(admin, item, linha.variante_lacrado_id);
  } else if (linha.produto_id) {
    const { error } = await admin.from("produtos").update({ visivel_loja: true }).eq("id", linha.produto_id);
    if (error) throw new Error(`Falha ao reafirmar visibilidade do produto: ${error.message}`);
  } else if (linha.aparelho_ids?.length) {
    const { error } = await admin
      .from("aparelhos")
      .update({ disponivel_loja_virtual: true })
      .in("id", linha.aparelho_ids)
      .eq("status", "disponivel");
    if (error) throw new Error(`Falha ao reafirmar disponibilidade dos aparelhos: ${error.message}`);
  }
}
