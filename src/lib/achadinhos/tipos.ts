/**
 * Fase 263 — Achadinhos da Neotec. Tipos do domínio.
 *
 * `ProdutoAchadinho` espelha a tabela `achadinhos_produtos` inteira (uso
 * administrativo — inclui campos de performance). `ProdutoPublico`
 * espelha a VIEW `achadinhos_produtos_publicos` (o que o site público
 * enxerga: sem link de afiliado cru, sem comissão/receita/custo).
 */

export const STATUS_PRODUTO = ["rascunho", "ativo", "pausado", "arquivado"] as const;
export type StatusProduto = (typeof STATUS_PRODUTO)[number];

/** Onde o produto é vendido. Hoje só Mercado Livre; ver `link.ts` pra adicionar outra. */
export type OrigemAfiliado = "mercado_livre";

export interface InformacaoProduto {
  rotulo: string;
  valor: string;
}

export interface ProdutoAchadinho {
  id: string;
  loja_id: string;
  nome: string;
  slug: string;
  descricao: string | null;
  categoria: string | null;
  imagem_principal: string | null;
  imagens: string[];
  video_url: string | null;
  preco_atual: number | null;
  preco_anterior: number | null;
  desconto_percentual: number | null;
  link_afiliado: string;
  origem: OrigemAfiliado;
  tags: string[];
  status: StatusProduto;
  destaque: boolean;
  selo: string | null;
  score: number;
  ordem: number;
  informacoes: InformacaoProduto[];
  observacoes: string | null;
  seo_titulo: string | null;
  seo_descricao: string | null;
  imagem_og: string | null;
  cliques: number;
  vendas: number;
  comissao: number | null;
  receita: number | null;
  custo_midia: number | null;
  roas: number | null;
  ctr: number | null;
  cpc: number | null;
  status_performance: string | null;
  excluido_em: string | null;
  created_at: string;
  updated_at: string;
}

export type ProdutoPublico = Pick<
  ProdutoAchadinho,
  | "id" | "nome" | "slug" | "descricao" | "categoria"
  | "imagem_principal" | "imagens" | "video_url"
  | "preco_atual" | "preco_anterior" | "desconto_percentual"
  | "origem" | "tags" | "destaque" | "selo" | "score" | "ordem"
  | "informacoes" | "observacoes"
  | "seo_titulo" | "seo_descricao" | "imagem_og"
  | "created_at" | "updated_at"
>;

/** Quem executa uma operação — vai pro log de auditoria. */
export interface Ator {
  tipo: "claude" | "usuario" | "sistema";
  nome: string;
  /** id da chave de API (claude) ou do usuário (usuario). */
  id?: string;
  escopos: Escopo[];
}

export const ESCOPOS = ["leitura", "escrita", "status", "excluir"] as const;
export type Escopo = (typeof ESCOPOS)[number];

export interface EntradaLog {
  ator: Ator;
  operacao: string;
  produto_id: string | null;
  produto_nome: string | null;
  resultado: "sucesso" | "erro" | "negado";
  detalhe?: Record<string, unknown> | null;
}

export interface LogAchadinho {
  id: string;
  criado_em: string;
  ator_tipo: "claude" | "usuario" | "sistema";
  ator_nome: string;
  operacao: string;
  produto_id: string | null;
  produto_nome: string | null;
  resultado: "sucesso" | "erro" | "negado";
  detalhe: Record<string, unknown> | null;
}

export interface ChaveApiAchadinho {
  id: string;
  nome: string;
  prefixo: string;
  escopos: Escopo[];
  ativo: boolean;
  criado_em: string;
  ultimo_uso_em: string | null;
  revogada_em: string | null;
}

export interface ResumoCatalogo {
  total: number;
  rascunhos: number;
  ativos: number;
  pausados: number;
  arquivados: number;
  /** Produtos ATIVOS marcados como destaque (os que aparecem em destaque no site). */
  destaques: number;
  excluidos: number;
  cliques_total: number;
  mais_clicados: { id: string; nome: string; slug: string; cliques: number }[];
}
