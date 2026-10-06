import { z } from "zod";
import { escopoPermite } from "@/lib/achadinhos/chaves";
import { urlPublicaProduto } from "@/lib/achadinhos/apresentacao";
import { validarLinkAfiliado } from "@/lib/achadinhos/link";
import {
  formatarErroZod, mapaErrosPt, schemaAtualizarProduto, schemaCriarProduto, validarCoerencia,
} from "@/lib/achadinhos/schemas";
import { gerarSlug, slugUnico } from "@/lib/achadinhos/slug";
import {
  STATUS_PRODUTO,
  type Ator, type Escopo, type ProdutoAchadinho, type ResumoCatalogo, type StatusProduto,
} from "@/lib/achadinhos/tipos";
import { ErroSlugDuplicado, type AchadinhosRepository } from "./achadinhos.repository";

/**
 * Fase 263 — operações do catálogo. É A ÚNICA porta de escrita nos produtos:
 * o painel (Server Actions) e o conector do Claude (REST/MCP) chamam
 * `executarFerramenta`, então as mesmas regras (validação, escopo,
 * exclusão lógica, log de auditoria) valem pros dois, sem divergir.
 */

export type NomeFerramenta =
  | "create_product" | "update_product" | "get_product" | "list_products"
  | "activate_product" | "pause_product" | "archive_product" | "delete_product"
  | "get_catalog_summary";

export type CodigoErro =
  | "nao_autorizado" | "nao_encontrado" | "invalido" | "conflito"
  | "confirmacao_necessaria" | "ferramenta_desconhecida" | "erro";

type ProdutoRef = Pick<ProdutoAchadinho, "id" | "nome" | "slug">;

export type ResultadoFerramenta =
  | { ok: true; dados: unknown; mensagem?: string; produto?: ProdutoRef; detalhe?: Record<string, unknown>; revalidar?: string[] }
  | { ok: false; codigo: CodigoErro; erro: string; produto?: ProdutoRef; detalhe?: Record<string, unknown> };

// ---------------------------------------------------------------------------
// Definição das ferramentas (nome, escopo e JSON Schema — usado pelo MCP e
// pela listagem REST). As descrições carregam as regras de honestidade pro
// modelo: ele lê isso antes de decidir o que preencher.
// ---------------------------------------------------------------------------

export interface DefinicaoFerramenta {
  nome: NomeFerramenta;
  descricao: string;
  escopo: Escopo;
  entrada: Record<string, unknown>;
}

const REGRA_HONESTIDADE =
  "NUNCA invente preços, descontos, avaliações, número de vendas, características, garantia ou disponibilidade: se a informação não foi fornecida, omita o campo.";

const PROPRIEDADES_PRODUTO = {
  nome: { type: "string", description: "Nome do produto (2 a 160 caracteres)." },
  descricao: { type: "string", description: "Descrição. Só o que foi informado ou está no anúncio — sem inventar." },
  categoria: { type: "string", description: "Categoria (ex.: Fones, Carregadores, Smartwatch)." },
  imagem_principal: { type: "string", description: "URL https da imagem principal." },
  imagens: { type: "array", items: { type: "string" }, description: "URLs https da galeria (até 12)." },
  video_url: { type: "string", description: "URL https de vídeo (YouTube ou arquivo mp4)." },
  preco_atual: { type: "number", description: "Preço atual em reais. Só se foi informado." },
  preco_anterior: { type: "number", description: "Preço anterior em reais; precisa ser MAIOR que o atual. Só se foi informado." },
  desconto_percentual: { type: "number", description: "Desconto em %, só se informado; precisa bater com os preços." },
  link_afiliado: { type: "string", description: "Link de afiliado https do Mercado Livre (mercadolivre.com.br, meli.la...)." },
  origem: { type: "string", enum: ["mercado_livre"], description: "Marketplace de destino. Padrão: mercado_livre." },
  tags: { type: "array", items: { type: "string" }, description: "Até 15 tags curtas." },
  destaque: { type: "boolean", description: "Marca como destaque no catálogo." },
  selo: { type: "string", description: "Selo curto no card (ex.: \"Em alta\")." },
  score: { type: "number", description: "Pontuação interna (0 a 9999)." },
  ordem: { type: "integer", description: "Ordem de exibição (menor aparece primeiro)." },
  informacoes: {
    type: "array",
    items: { type: "object", properties: { rotulo: { type: "string" }, valor: { type: "string" } }, required: ["rotulo", "valor"] },
    description: "Informações relevantes em pares rótulo/valor. Só as fornecidas.",
  },
  observacoes: { type: "string", description: "Observações exibidas na página do produto." },
  seo_titulo: { type: "string", description: "Título SEO (até 70 caracteres)." },
  seo_descricao: { type: "string", description: "Meta description (até 170 caracteres)." },
  imagem_og: { type: "string", description: "URL https da imagem de compartilhamento (padrão: imagem principal)." },
};

const SELETOR = {
  id: { type: "string", description: "UUID do produto." },
  slug: { type: "string", description: "Slug do produto (alternativa ao id)." },
};

export const FERRAMENTAS: DefinicaoFerramenta[] = [
  {
    nome: "create_product",
    escopo: "escrita",
    descricao: `Cria um produto no catálogo Achadinhos da Neotec. O produto nasce SEMPRE como rascunho (não aparece no site); para publicar use activate_product. ${REGRA_HONESTIDADE}`,
    entrada: { type: "object", properties: PROPRIEDADES_PRODUTO, required: ["nome", "link_afiliado"], additionalProperties: false },
  },
  {
    nome: "update_product",
    escopo: "escrita",
    descricao: `Edita campos de um produto (informe id ou slug + só os campos a mudar; null limpa um campo). O slug não muda depois de criado. ${REGRA_HONESTIDADE}`,
    entrada: {
      type: "object",
      properties: { ...SELETOR, ...Object.fromEntries(Object.entries(PROPRIEDADES_PRODUTO).filter(([k]) => k !== "slug")) },
      additionalProperties: false,
    },
  },
  {
    nome: "get_product",
    escopo: "leitura",
    descricao: "Consulta um produto completo (inclui cliques e demais métricas). Informe id ou slug.",
    entrada: { type: "object", properties: SELETOR, additionalProperties: false },
  },
  {
    nome: "list_products",
    escopo: "leitura",
    descricao: "Lista produtos (resumo). Filtros opcionais por status, categoria e busca por texto. Exclui os removidos, a menos que incluir_excluidos=true.",
    entrada: {
      type: "object",
      properties: {
        status: { type: "string", enum: [...STATUS_PRODUTO] },
        categoria: { type: "string" },
        busca: { type: "string", description: "Texto buscado no nome, categoria e slug." },
        limite: { type: "integer", minimum: 1, maximum: 200, description: "Padrão 50." },
        incluir_excluidos: { type: "boolean" },
      },
      additionalProperties: false,
    },
  },
  {
    nome: "activate_product",
    escopo: "status",
    descricao: "Ativa (publica no site) um produto que a pessoa aprovou. Só use quando a pessoa pediu a publicação.",
    entrada: { type: "object", properties: SELETOR, additionalProperties: false },
  },
  {
    nome: "pause_product",
    escopo: "status",
    descricao: "Pausa um produto: sai do catálogo público mas continua guardado e pode ser reativado.",
    entrada: { type: "object", properties: SELETOR, additionalProperties: false },
  },
  {
    nome: "archive_product",
    escopo: "status",
    descricao: "Arquiva um produto antigo: sai do catálogo público e fica só no histórico.",
    entrada: { type: "object", properties: SELETOR, additionalProperties: false },
  },
  {
    nome: "delete_product",
    escopo: "excluir",
    descricao:
      'OPERAÇÃO PROTEGIDA. Exclui um produto (exclusão lógica: some de tudo, o histórico de cliques e do log é preservado). Só use quando a pessoa pediu EXPLICITAMENTE para excluir. Exige confirmacao com o texto exato "EXCLUIR <slug>"; sem isso a chamada é recusada.',
    entrada: {
      type: "object",
      properties: { ...SELETOR, confirmacao: { type: "string", description: 'Texto exato: "EXCLUIR <slug-do-produto>".' } },
      required: ["confirmacao"],
      additionalProperties: false,
    },
  },
  {
    nome: "get_catalog_summary",
    escopo: "leitura",
    descricao: "Resumo do catálogo: total, rascunhos, ativos, pausados, arquivados, destaques, excluídos, cliques e produtos mais clicados.",
    entrada: { type: "object", properties: {}, additionalProperties: false },
  },
];

const FERRAMENTAS_POR_NOME = Object.fromEntries(FERRAMENTAS.map((f) => [f.nome, f])) as Record<string, DefinicaoFerramenta>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ok = (dados: unknown, extra: Partial<Extract<ResultadoFerramenta, { ok: true }>> = {}): ResultadoFerramenta => ({ ok: true, dados, ...extra });
const falha = (codigo: CodigoErro, erro: string, extra: Partial<Extract<ResultadoFerramenta, { ok: false }>> = {}): ResultadoFerramenta => ({ ok: false, codigo, erro, ...extra });

function ref(p: ProdutoAchadinho): ProdutoRef {
  return { id: p.id, nome: p.nome, slug: p.slug };
}

/** Representação completa devolvida ao chamador (sem `loja_id`, com a URL pública). */
function completo(p: ProdutoAchadinho) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { loja_id, ...resto } = p;
  return { ...resto, url_publica: urlPublicaProduto(p.slug) };
}

function resumido(p: ProdutoAchadinho) {
  return {
    id: p.id, nome: p.nome, slug: p.slug, status: p.status, categoria: p.categoria,
    preco_atual: p.preco_atual, preco_anterior: p.preco_anterior,
    destaque: p.destaque, ordem: p.ordem, cliques: p.cliques,
    excluido: p.excluido_em !== null, url_publica: urlPublicaProduto(p.slug),
  };
}

function semUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

const CAMINHOS_CATALOGO = (slug: string) => ["/achadinhos", `/achadinhos/${slug}`, "/achadinhos/sitemap.xml"];

const schemaSeletor = z
  .object({ id: z.string().uuid().optional(), slug: z.string().trim().toLowerCase().optional() })
  .strict()
  .refine((s) => s.id || s.slug, "informe id ou slug");

const schemaExcluir = z
  .object({ id: z.string().uuid().optional(), slug: z.string().trim().toLowerCase().optional(), confirmacao: z.string().optional() })
  .strict()
  .refine((s) => s.id || s.slug, "informe id ou slug");

const schemaListar = z
  .object({
    status: z.enum(STATUS_PRODUTO).optional(),
    categoria: z.string().trim().max(60).optional(),
    busca: z.string().trim().max(80).optional(),
    limite: z.number().int().min(1).max(200).optional(),
    incluir_excluidos: z.boolean().optional(),
  })
  .strict();

function comoObjeto(args: unknown): Record<string, unknown> | null {
  if (args === undefined || args === null) return {};
  return typeof args === "object" && !Array.isArray(args) ? (args as Record<string, unknown>) : null;
}

async function localizar(repo: AchadinhosRepository, sel: { id?: string; slug?: string }): Promise<ProdutoAchadinho | null> {
  return sel.id ? repo.buscarPorId(sel.id) : repo.buscarPorSlug(sel.slug!);
}

const CURTO = (v: unknown) => (typeof v === "string" ? v.slice(0, 120) : Array.isArray(v) ? `[${v.length} itens]` : v ?? null);

function resumirMudancas(antes: ProdutoAchadinho, patch: Record<string, unknown>) {
  const campos = Object.keys(patch).filter(
    (k) => JSON.stringify((antes as unknown as Record<string, unknown>)[k] ?? null) !== JSON.stringify(patch[k] ?? null)
  );
  return {
    campos,
    antes: Object.fromEntries(campos.map((k) => [k, CURTO((antes as unknown as Record<string, unknown>)[k])])),
    depois: Object.fromEntries(campos.map((k) => [k, CURTO(patch[k])])),
  };
}

async function listarTodos(repo: AchadinhosRepository): Promise<ProdutoAchadinho[]> {
  const tudo: ProdutoAchadinho[] = [];
  for (let pagina = 0; pagina < 20; pagina++) {
    const lote = await repo.listar({ incluirExcluidos: true, limite: 1000, offset: pagina * 1000 });
    tudo.push(...lote);
    if (lote.length < 1000) break;
  }
  return tudo;
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

type Handler = (args: unknown, ator: Ator, repo: AchadinhosRepository) => Promise<ResultadoFerramenta>;

const criar: Handler = async (args, ator, repo) => {
  const parsed = schemaCriarProduto(ator).safeParse(args, { errorMap: mapaErrosPt });
  if (!parsed.success) return falha("invalido", formatarErroZod(parsed.error));
  const { status: statusPedido, ...d } = parsed.data as typeof parsed.data & { status?: StatusProduto };

  let slug: string;
  if (d.slug) {
    if (await repo.slugExiste(d.slug)) return falha("conflito", `Já existe um produto com o slug "${d.slug}"`);
    slug = d.slug;
  } else {
    slug = await slugUnico(gerarSlug(d.nome), (s) => repo.slugExiste(s));
  }

  const dados = semUndefined({ ...d, slug, origem: d.origem ?? "mercado_livre" }) as Partial<ProdutoAchadinho>;
  // Claude sempre cria rascunho; só quem está logado no painel escolhe outro status inicial.
  dados.status = ator.tipo === "usuario" ? statusPedido ?? "rascunho" : "rascunho";

  const criado = await repo.inserir(dados);
  return ok(completo(criado), {
    mensagem: criado.status === "rascunho" ? "Produto criado como rascunho (ainda não aparece no site)." : "Produto criado.",
    produto: ref(criado),
    detalhe: { status_inicial: criado.status },
    revalidar: CAMINHOS_CATALOGO(criado.slug),
  });
};

const atualizar: Handler = async (args, _ator, repo) => {
  const obj = comoObjeto(args);
  if (!obj) return falha("invalido", "Os argumentos precisam ser um objeto JSON");
  const { id, slug, ...campos } = obj;

  const sel = schemaSeletor.safeParse({ id, slug }, { errorMap: mapaErrosPt });
  if (!sel.success) return falha("invalido", formatarErroZod(sel.error));
  const atual = await localizar(repo, sel.data);
  if (!atual || atual.excluido_em) return falha("nao_encontrado", "Produto não encontrado");

  const parsed = schemaAtualizarProduto.safeParse(campos, { errorMap: mapaErrosPt });
  if (!parsed.success) return falha("invalido", formatarErroZod(parsed.error), { produto: ref(atual) });
  const patch = semUndefined(parsed.data) as Record<string, unknown>;
  if (Object.keys(patch).length === 0) return falha("invalido", "Nenhum campo para atualizar", { produto: ref(atual) });

  const mesclado = { ...atual, ...patch } as ProdutoAchadinho;
  const incoerencia = validarCoerencia(mesclado);
  if (incoerencia) {
    return falha("invalido", `${incoerencia}. Se mudou o preço, atualize também preço anterior/desconto para ficarem consistentes`, { produto: ref(atual) });
  }
  if ("origem" in patch) {
    const l = validarLinkAfiliado(mesclado.link_afiliado, mesclado.origem);
    if (!l.ok) return falha("invalido", l.erro, { produto: ref(atual) });
  }

  const mudancas = resumirMudancas(atual, patch);
  if (mudancas.campos.length === 0) {
    return ok(completo(atual), { mensagem: "Nenhuma alteração: os valores já eram esses.", produto: ref(atual), detalhe: { campos: [] } });
  }
  const novo = await repo.atualizar(atual.id, patch as Partial<ProdutoAchadinho>);
  return ok(completo(novo), { produto: ref(novo), detalhe: mudancas, revalidar: CAMINHOS_CATALOGO(novo.slug) });
};

const consultar: Handler = async (args, _ator, repo) => {
  const sel = schemaSeletor.safeParse(args ?? {}, { errorMap: mapaErrosPt });
  if (!sel.success) return falha("invalido", formatarErroZod(sel.error));
  const p = await localizar(repo, sel.data);
  if (!p) return falha("nao_encontrado", "Produto não encontrado");
  return ok(completo(p), { produto: ref(p) });
};

const listar: Handler = async (args, _ator, repo) => {
  const parsed = schemaListar.safeParse(args ?? {}, { errorMap: mapaErrosPt });
  if (!parsed.success) return falha("invalido", formatarErroZod(parsed.error));
  const f = parsed.data;
  const lista = await repo.listar({
    status: f.status, categoria: f.categoria, busca: f.busca,
    incluirExcluidos: f.incluir_excluidos, limite: f.limite ?? 50,
  });
  return ok({ quantidade: lista.length, produtos: lista.map(resumido) }, { detalhe: { filtros: f } });
};

function transicao(novoStatus: StatusProduto, verbo: string): Handler {
  return async (args, _ator, repo) => {
    const sel = schemaSeletor.safeParse(args ?? {}, { errorMap: mapaErrosPt });
    if (!sel.success) return falha("invalido", formatarErroZod(sel.error));
    const p = await localizar(repo, sel.data);
    if (!p || p.excluido_em) return falha("nao_encontrado", "Produto não encontrado");

    if (p.status === novoStatus) {
      return ok(completo(p), { mensagem: `O produto já estava ${novoStatus}.`, produto: ref(p), detalhe: { de: p.status, para: novoStatus, sem_mudanca: true } });
    }
    if (novoStatus === "ativo") {
      const l = validarLinkAfiliado(p.link_afiliado, p.origem);
      if (!l.ok) return falha("invalido", `Não dá pra ativar: ${l.erro}. Corrija o link antes`, { produto: ref(p) });
    }
    const novo = await repo.atualizar(p.id, { status: novoStatus });
    return ok(completo(novo), { mensagem: `Produto ${verbo}.`, produto: ref(novo), detalhe: { de: p.status, para: novoStatus }, revalidar: CAMINHOS_CATALOGO(novo.slug) });
  };
}

const excluir: Handler = async (args, _ator, repo) => {
  const parsed = schemaExcluir.safeParse(args ?? {}, { errorMap: mapaErrosPt });
  if (!parsed.success) return falha("invalido", formatarErroZod(parsed.error));
  const p = await localizar(repo, parsed.data);
  if (!p || p.excluido_em) return falha("nao_encontrado", "Produto não encontrado (ou já excluído)");

  const esperado = `EXCLUIR ${p.slug}`;
  const recebido = (parsed.data.confirmacao ?? "").trim().replace(/\s+/g, " ");
  if (recebido !== esperado) {
    return falha(
      "confirmacao_necessaria",
      `Operação protegida: nada foi excluído. Para excluir "${p.nome}", repita a chamada com confirmacao: "${esperado}" — mas só se a pessoa pediu explicitamente essa exclusão.`,
      { produto: ref(p), detalhe: { motivo: "confirmacao_ausente_ou_incorreta" } }
    );
  }
  // Exclusão LÓGICA: o registro (e o histórico de cliques/log que aponta pra ele) permanece.
  const novo = await repo.atualizar(p.id, { excluido_em: new Date().toISOString(), status: "arquivado", destaque: false });
  return ok(
    { id: novo.id, slug: novo.slug, excluido_em: novo.excluido_em },
    { mensagem: "Produto excluído (exclusão lógica: histórico preservado).", produto: ref(novo), revalidar: CAMINHOS_CATALOGO(novo.slug) }
  );
};

/** Resumo do catálogo. Exportado pro painel mostrar os mesmos números SEM gerar entrada de log a cada visita. */
export async function calcularResumoCatalogo(repo: AchadinhosRepository): Promise<ResumoCatalogo> {
  const todos = await listarTodos(repo);
  const vivos = todos.filter((p) => !p.excluido_em);
  const contar = (s: StatusProduto) => vivos.filter((p) => p.status === s).length;
  return {
    total: vivos.length,
    rascunhos: contar("rascunho"),
    ativos: contar("ativo"),
    pausados: contar("pausado"),
    arquivados: contar("arquivado"),
    destaques: vivos.filter((p) => p.status === "ativo" && p.destaque).length,
    excluidos: todos.length - vivos.length,
    cliques_total: vivos.reduce((soma, p) => soma + p.cliques, 0),
    mais_clicados: vivos
      .filter((p) => p.cliques > 0)
      .sort((a, b) => b.cliques - a.cliques)
      .slice(0, 5)
      .map((p) => ({ id: p.id, nome: p.nome, slug: p.slug, cliques: p.cliques })),
  };
}

const resumoCatalogo: Handler = async (_args, _ator, repo) => ok(await calcularResumoCatalogo(repo));

const HANDLERS: Record<NomeFerramenta, Handler> = {
  create_product: criar,
  update_product: atualizar,
  get_product: consultar,
  list_products: listar,
  activate_product: transicao("ativo", "ativado (já aparece no site)"),
  pause_product: transicao("pausado", "pausado (saiu do catálogo público)"),
  archive_product: transicao("arquivado", "arquivado"),
  delete_product: excluir,
  get_catalog_summary: resumoCatalogo,
};

// ---------------------------------------------------------------------------
// Execução com autorização + log
// ---------------------------------------------------------------------------

async function registrar(repo: AchadinhosRepository, ator: Ator, operacao: string, r: ResultadoFerramenta) {
  const resultado = r.ok ? "sucesso" : r.codigo === "nao_autorizado" || r.codigo === "confirmacao_necessaria" ? "negado" : "erro";
  try {
    await repo.registrarLog({
      ator,
      operacao,
      produto_id: r.produto?.id ?? null,
      produto_nome: r.produto?.nome ?? null,
      resultado,
      detalhe: { ...(r.detalhe ?? {}), ...(r.ok ? {} : { erro: r.erro, codigo: r.codigo }) },
    });
  } catch (e) {
    // O log nunca derruba a operação já feita — mas o erro não pode sumir.
    console.error("[achadinhos] falha ao gravar log de auditoria:", e instanceof Error ? e.message : e);
  }
}

export async function executarFerramenta(
  nome: string,
  args: unknown,
  ator: Ator,
  repo: AchadinhosRepository
): Promise<ResultadoFerramenta> {
  const def = FERRAMENTAS_POR_NOME[nome];
  if (!def) return falha("ferramenta_desconhecida", `Ferramenta desconhecida: ${nome}`);

  if (!escopoPermite(ator.escopos, def.escopo)) {
    const r = falha("nao_autorizado", `Sem permissão: ${nome} exige o escopo "${def.escopo}"`, { detalhe: { escopo_necessario: def.escopo } });
    await registrar(repo, ator, nome, r);
    return r;
  }

  let r: ResultadoFerramenta;
  try {
    r = await HANDLERS[def.nome](args, ator, repo);
  } catch (e) {
    if (e instanceof ErroSlugDuplicado) {
      r = falha("conflito", e.message);
    } else {
      console.error(`[achadinhos] erro em ${nome}:`, e instanceof Error ? e.message : e);
      r = falha("erro", "Erro interno ao executar a operação", { detalhe: { mensagem_interna: e instanceof Error ? e.message : String(e) } });
    }
  }
  await registrar(repo, ator, nome, r);
  return r;
}
