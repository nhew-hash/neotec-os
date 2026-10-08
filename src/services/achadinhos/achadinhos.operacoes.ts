import { z } from "zod";
import { escopoPermite } from "@/lib/achadinhos/chaves";
import { urlPublicaProduto } from "@/lib/achadinhos/apresentacao";
import { validarLinkAfiliado } from "@/lib/achadinhos/link";
import {
  formatarErroZod, idMl, jsonPequeno, mapaErrosPt, schemaAtualizarProduto, schemaCriarProduto, validarCoerencia,
} from "@/lib/achadinhos/schemas";
import { gerarSlug, slugUnico } from "@/lib/achadinhos/slug";
import {
  CLASSES_MIDIA, STATUS_CANDIDATO, STATUS_PRODUTO,
  type Ator, type CandidatoAchadinho, type Escopo, type ProdutoAchadinho, type ResumoCatalogo, type StatusProduto,
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
  | "get_catalog_summary"
  | "upsert_candidates" | "list_candidates" | "set_candidate_status" | "record_price";

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
  ml_catalog_id: { type: "string", description: "Id do produto de catálogo do Mercado Livre (ex.: MLB123456). Interno." },
  ml_item_id: { type: "string", description: "Id do anúncio do Mercado Livre (ex.: MLB987654). Interno." },
  midia_classe: { type: "string", enum: [...CLASSES_MIDIA], description: "Classe de mídia: A tem vídeo, B 3+ fotos boas, C 1–2 fotos, D sem mídia. Interno." },
  score_detalhe: { type: "object", description: "Notas e motivos da peneira (JSON). Interno." },
};

const PROPRIEDADES_CANDIDATO = {
  ml_catalog_id: { type: "string", description: "Id do produto de catálogo do ML (ex.: MLB123456). Chave de deduplicação." },
  ml_item_id: { type: "string", description: "Id do anúncio escolhido (ex.: MLB987654)." },
  nome: { type: "string", description: "Nome como veio da API do ML." },
  categoria: { type: "string" },
  preco: { type: "number", description: "Preço da API (\"outros meios\")." },
  preco_anterior_oficial: { type: "number", description: "SÓ o original_price informado pelo anúncio; precisa ser MAIOR que o preço. Nunca estimar." },
  fotos: { type: "array", items: { type: "string" }, description: "URLs https das fotos (até 12)." },
  tem_video: { type: "boolean" },
  url_produto: { type: "string", description: "URL https da página do produto no ML (NÃO é link de afiliado)." },
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
  {
    nome: "upsert_candidates",
    escopo: "escrita",
    descricao: `Fábrica: grava candidatos achados na captação (API do Mercado Livre), até 100 por chamada. Deduplica por ml_catalog_id: o que já está no catálogo é ignorado; o que já é candidato só tem os dados do ML atualizados (status, score e link não mudam). Novos entram como ENCONTRADO. ${REGRA_HONESTIDADE}`,
    entrada: {
      type: "object",
      properties: {
        candidatos: {
          type: "array",
          items: { type: "object", properties: PROPRIEDADES_CANDIDATO, required: ["ml_catalog_id", "nome"], additionalProperties: false },
        },
      },
      required: ["candidatos"],
      additionalProperties: false,
    },
  },
  {
    nome: "list_candidates",
    escopo: "leitura",
    descricao: "Fábrica: lista candidatos da captação (maior score primeiro). Filtro opcional por status.",
    entrada: {
      type: "object",
      properties: {
        status: { type: "string", enum: [...STATUS_CANDIDATO] },
        limite: { type: "integer", minimum: 1, maximum: 500, description: "Padrão 50." },
      },
      additionalProperties: false,
    },
  },
  {
    nome: "set_candidate_status",
    escopo: "escrita",
    descricao:
      "Fábrica: muda o status de um candidato e grava o resultado da peneira (product_score, classe, notas, motivos). DESCARTADO exige motivo_descarte. LINK_OK exige link_afiliado válido do Mercado Livre — o link vem do Gerador de Links da Central de Afiliados, NUNCA montado à mão. CADASTRADO exige produto_id de um produto do catálogo. Candidato CADASTRADO não muda mais.",
    entrada: {
      type: "object",
      properties: {
        id: { type: "string", description: "UUID do candidato." },
        status: { type: "string", enum: [...STATUS_CANDIDATO] },
        product_score: { type: "number", description: "0 a 100." },
        classe: { type: "string", enum: [...CLASSES_MIDIA] },
        notas: { type: "object" },
        motivos: { type: "object" },
        motivo_descarte: { type: "string" },
        link_afiliado: { type: "string" },
        produto_id: { type: "string", description: "UUID do produto criado (status CADASTRADO)." },
      },
      required: ["id", "status"],
      additionalProperties: false,
    },
  },
  {
    nome: "record_price",
    escopo: "escrita",
    descricao:
      "Fábrica: registra uma conferência de preço de um produto (histórico). Se o preço mudou, atualiza o preço do produto; preco_anterior só se o anúncio informar oficialmente (senão o preço anterior e o desconto são limpos, pra não exibir desconto falso). Não muda status: se disponivel=false, use pause_product.",
    entrada: {
      type: "object",
      properties: {
        ...SELETOR,
        preco: { type: "number", description: "Preço atual conferido na API do ML." },
        preco_anterior: { type: "number", description: "original_price do anúncio, só se existir." },
        disponivel: { type: "boolean", description: "false se o anúncio não está mais disponível. Padrão true." },
      },
      additionalProperties: false,
    },
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
    destaque: p.destaque, ordem: p.ordem, cliques: p.cliques, score: p.score, midia_classe: p.midia_classe ?? null,
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

// ---------------------------------------------------------------------------
// Fase 264 — fábrica: candidatos da captação e conferência de preço
// ---------------------------------------------------------------------------

const urlHttps = z.string().trim().max(2000).url().refine((u) => u.startsWith("https://"), "precisa ser https");
const precoMl = z.number().finite().min(0).max(9_999_999.99);

const schemaCandidato = z
  .object({
    ml_catalog_id: idMl,
    ml_item_id: idMl.nullish(),
    nome: z.string().trim().min(2).max(200),
    categoria: z.string().trim().max(60).nullish(),
    preco: precoMl.nullish(),
    preco_anterior_oficial: precoMl.nullish(),
    fotos: z.array(urlHttps).max(12).optional(),
    tem_video: z.boolean().optional(),
    url_produto: urlHttps.nullish(),
  })
  .strict()
  .refine(
    (c) => c.preco_anterior_oficial == null || (c.preco != null && c.preco_anterior_oficial > c.preco),
    { message: "preco_anterior_oficial precisa ser maior que o preço (senão não existe desconto real)", path: ["preco_anterior_oficial"] }
  );

const schemaUpsertCandidatos = z.object({ candidatos: z.array(z.unknown()).min(1).max(100) }).strict();

const schemaListarCandidatos = z
  .object({ status: z.enum(STATUS_CANDIDATO).optional(), limite: z.number().int().min(1).max(500).optional() })
  .strict();

const schemaStatusCandidato = z
  .object({
    id: z.string().uuid(),
    status: z.enum(STATUS_CANDIDATO),
    product_score: z.number().finite().min(0).max(100).nullish(),
    classe: z.enum(CLASSES_MIDIA).nullish(),
    notas: jsonPequeno.nullish(),
    motivos: jsonPequeno.nullish(),
    motivo_descarte: z.string().trim().min(3).max(300).nullish(),
    link_afiliado: z.string().trim().max(2000).nullish(),
    produto_id: z.string().uuid().nullish(),
  })
  .strict();

const schemaPreco = z
  .object({
    id: z.string().uuid().optional(),
    slug: z.string().trim().toLowerCase().optional(),
    preco: precoMl.nullish(),
    preco_anterior: precoMl.nullish(),
    disponivel: z.boolean().optional(),
  })
  .strict()
  .refine((s) => s.id || s.slug, "informe id ou slug")
  .refine((s) => s.disponivel === false || s.preco != null, "informe o preço (ou disponivel=false)");

const upsertCandidatos: Handler = async (args, _ator, repo) => {
  const lote = schemaUpsertCandidatos.safeParse(args ?? {}, { errorMap: mapaErrosPt });
  if (!lote.success) return falha("invalido", formatarErroZod(lote.error));

  const validos: z.infer<typeof schemaCandidato>[] = [];
  const ignorados: { indice: number; ml_catalog_id: string | null; motivo: string }[] = [];
  lote.data.candidatos.forEach((bruto, indice) => {
    const c = schemaCandidato.safeParse(bruto, { errorMap: mapaErrosPt });
    const id = typeof (bruto as Record<string, unknown>)?.ml_catalog_id === "string" ? String((bruto as Record<string, unknown>).ml_catalog_id) : null;
    if (!c.success) ignorados.push({ indice, ml_catalog_id: id, motivo: formatarErroZod(c.error) });
    else if (validos.some((v) => v.ml_catalog_id === c.data.ml_catalog_id)) ignorados.push({ indice, ml_catalog_id: id, motivo: "repetido no mesmo lote" });
    else validos.push(c.data);
  });

  const ids = validos.map((c) => c.ml_catalog_id);
  const noCatalogo = new Set((await repo.produtosPorCatalogoMl(ids)).map((p) => p.ml_catalog_id));
  const existentes = new Map((await repo.candidatosPorCatalogoMl(ids)).map((c) => [c.ml_catalog_id, c]));

  let inseridos = 0;
  let atualizados = 0;
  for (const c of validos) {
    if (noCatalogo.has(c.ml_catalog_id)) {
      ignorados.push({ indice: -1, ml_catalog_id: c.ml_catalog_id, motivo: "já está no catálogo" });
      continue;
    }
    const dados = semUndefined({ ...c }) as Partial<CandidatoAchadinho>;
    const atual = existentes.get(c.ml_catalog_id);
    if (atual) {
      // Só os dados do ML mudam; status, score e link são da peneira/afiliado.
      await repo.atualizarCandidato(atual.id, dados);
      atualizados++;
    } else {
      await repo.inserirCandidato({ ...dados, status: "ENCONTRADO" });
      inseridos++;
    }
  }
  return ok(
    { inseridos, atualizados, ignorados },
    { mensagem: `${inseridos} candidato(s) novo(s), ${atualizados} atualizado(s), ${ignorados.length} ignorado(s).`, detalhe: { inseridos, atualizados, ignorados: ignorados.length } }
  );
};

const listarCandidatos: Handler = async (args, _ator, repo) => {
  const parsed = schemaListarCandidatos.safeParse(args ?? {}, { errorMap: mapaErrosPt });
  if (!parsed.success) return falha("invalido", formatarErroZod(parsed.error));
  const lista = await repo.listarCandidatos({ status: parsed.data.status, limite: parsed.data.limite ?? 50 });
  return ok({ quantidade: lista.length, candidatos: lista }, { detalhe: { filtros: parsed.data } });
};

const statusCandidato: Handler = async (args, _ator, repo) => {
  const parsed = schemaStatusCandidato.safeParse(args ?? {}, { errorMap: mapaErrosPt });
  if (!parsed.success) return falha("invalido", formatarErroZod(parsed.error));
  const { id, ...d } = parsed.data;
  const atual = await repo.buscarCandidato(id);
  if (!atual) return falha("nao_encontrado", "Candidato não encontrado");
  if (atual.status === "CADASTRADO" && d.status !== "CADASTRADO") {
    return falha("conflito", "Candidato já virou produto do catálogo; mude o produto, não o candidato");
  }

  const patch = semUndefined({ ...d }) as Partial<CandidatoAchadinho>;
  if (d.status === "DESCARTADO" && !d.motivo_descarte) return falha("invalido", "DESCARTADO exige motivo_descarte");
  const link = d.link_afiliado ?? atual.link_afiliado;
  if (d.link_afiliado) {
    const l = validarLinkAfiliado(d.link_afiliado);
    if (!l.ok) return falha("invalido", l.erro);
    patch.link_afiliado = l.url;
  }
  if (d.status === "LINK_OK" && !link) return falha("invalido", "LINK_OK exige link_afiliado (gerado no Gerador de Links do Mercado Livre)");
  if (d.status === "CADASTRADO") {
    const produtoId = d.produto_id ?? atual.produto_id;
    if (!produtoId) return falha("invalido", "CADASTRADO exige produto_id");
    const p = await repo.buscarPorId(produtoId);
    if (!p || p.excluido_em) return falha("nao_encontrado", "Produto do catálogo não encontrado");
  }

  const novo = await repo.atualizarCandidato(atual.id, patch);
  return ok(novo, { mensagem: `Candidato ${novo.status}.`, detalhe: { candidato_id: novo.id, ml_catalog_id: novo.ml_catalog_id, de: atual.status, para: novo.status } });
};

const registrarPreco: Handler = async (args, _ator, repo) => {
  const parsed = schemaPreco.safeParse(args ?? {}, { errorMap: mapaErrosPt });
  if (!parsed.success) return falha("invalido", formatarErroZod(parsed.error));
  const { preco, preco_anterior, disponivel = true, ...sel } = parsed.data;
  const p = await localizar(repo, sel);
  if (!p || p.excluido_em) return falha("nao_encontrado", "Produto não encontrado");

  const anteriorOficial = preco_anterior != null && preco != null && preco_anterior > preco ? preco_anterior : null;
  await repo.registrarPreco({ produto_id: p.id, preco: preco ?? null, preco_anterior: anteriorOficial, disponivel, origem: "api_ml" });

  const mudou = disponivel && preco != null && (Number(p.preco_atual) !== preco || (p.preco_anterior ?? null) !== anteriorOficial);
  let atual = p;
  if (mudou) {
    // Desconto é sempre informado por quem cadastra, nunca calculado: com preço novo ele é limpo.
    atual = await repo.atualizar(p.id, { preco_atual: preco, preco_anterior: anteriorOficial, desconto_percentual: null });
  }
  return ok(
    { slug: atual.slug, disponivel, mudou, preco_antes: p.preco_atual, preco_agora: atual.preco_atual, preco_anterior: atual.preco_anterior },
    {
      mensagem: !disponivel
        ? "Anúncio indisponível registrado. Nada foi pausado: use pause_product se for o caso."
        : mudou ? `Preço atualizado de ${p.preco_atual ?? "—"} para ${preco}.` : "Preço conferido: sem mudança.",
      produto: ref(atual),
      detalhe: { disponivel, mudou, de: p.preco_atual, para: atual.preco_atual },
      revalidar: mudou ? CAMINHOS_CATALOGO(atual.slug) : undefined,
    }
  );
};

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
  upsert_candidates: upsertCandidatos,
  list_candidates: listarCandidatos,
  set_candidate_status: statusCandidato,
  record_price: registrarPreco,
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
