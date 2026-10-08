import type { LogAchadinho } from "./tipos";

/** Operações que só consultam — escondidas por padrão na tela de atividade. */
export const OPERACOES_DE_LEITURA = ["get_product", "list_products", "get_catalog_summary", "list_candidates"];

const FEITO: Record<string, string> = {
  create_product: "criou",
  update_product: "editou",
  activate_product: "ativou",
  pause_product: "pausou",
  archive_product: "arquivou",
  delete_product: "excluiu",
  get_product: "consultou",
  list_products: "listou",
  get_catalog_summary: "consultou o resumo do",
  criar_chave_api: "criou a chave de API",
  revogar_chave_api: "revogou a chave de API",
};

const INFINITIVO: Record<string, string> = {
  create_product: "criar",
  update_product: "editar",
  activate_product: "ativar",
  pause_product: "pausar",
  archive_product: "arquivar",
  delete_product: "excluir",
  get_product: "consultar",
  list_products: "listar",
  get_catalog_summary: "consultar o resumo do catálogo",
  upsert_candidates: "gravar candidatos da captação",
  list_candidates: "listar os candidatos",
  set_candidate_status: "mudar o status de um candidato",
  record_price: "conferir o preço",
};

const CAMPOS: Record<string, string> = {
  nome: "nome", descricao: "descrição", categoria: "categoria", imagem_principal: "imagem principal", imagens: "imagens",
  video_url: "vídeo", preco_atual: "preço atual", preco_anterior: "preço anterior", desconto_percentual: "desconto",
  link_afiliado: "link de afiliado", origem: "origem", tags: "tags", destaque: "destaque", selo: "selo", score: "score",
  ordem: "ordem", informacoes: "informações", observacoes: "observações", seo_titulo: "título SEO",
  seo_descricao: "descrição SEO", imagem_og: "imagem de compartilhamento",
  ml_catalog_id: "id de catálogo do ML", ml_item_id: "id do anúncio do ML", midia_classe: "classe de mídia",
  score_detalhe: "detalhe do score",
};

export function nomeDoAtor(l: Pick<LogAchadinho, "ator_tipo" | "ator_nome">): string {
  if (l.ator_tipo === "claude") return `Claude (${l.ator_nome})`;
  if (l.ator_tipo === "sistema") return "Sistema";
  return l.ator_nome;
}

/** "Claude (Chave X) criou o produto "Fone"", "Nhew editou o produto "Cabo" (preço atual, categoria)", etc. */
export function descreverLog(l: Pick<LogAchadinho, "ator_tipo" | "ator_nome" | "operacao" | "produto_nome" | "resultado" | "detalhe">): string {
  const ator = nomeDoAtor(l);
  const detalhe = (l.detalhe ?? {}) as Record<string, unknown>;
  const alvo = l.produto_nome ? ` o produto "${l.produto_nome}"` : "";
  const semProduto = ["list_products", "get_catalog_summary", "criar_chave_api", "revogar_chave_api",
    "upsert_candidates", "list_candidates", "set_candidate_status"].includes(l.operacao);

  if (l.resultado === "sucesso") {
    const feito = FEITO[l.operacao] ?? l.operacao;
    if (l.operacao === "get_catalog_summary") return `${ator} consultou o resumo do catálogo`;
    if (l.operacao === "list_products") return `${ator} listou os produtos`;
    if (l.operacao === "list_candidates") return `${ator} listou os candidatos da captação`;
    if (l.operacao === "upsert_candidates") {
      return `${ator} gravou candidatos da captação (${Number(detalhe.inseridos ?? 0)} novos, ${Number(detalhe.atualizados ?? 0)} atualizados)`;
    }
    if (l.operacao === "set_candidate_status") {
      return `${ator} marcou o candidato ${typeof detalhe.ml_catalog_id === "string" ? `${detalhe.ml_catalog_id} ` : ""}como ${String(detalhe.para ?? "?")}`;
    }
    if (l.operacao === "record_price") {
      return `${ator} conferiu o preço${alvo.replace(" o produto", " do produto")}${detalhe.mudou ? ` (mudou para ${String(detalhe.para)})` : ""}`;
    }
    if (l.operacao.endsWith("_chave_api")) return `${ator} ${feito}${typeof detalhe.nome === "string" ? ` "${detalhe.nome}"` : ""}`;
    const campos = Array.isArray(detalhe.campos) && detalhe.campos.length
      ? ` (${(detalhe.campos as string[]).map((c) => CAMPOS[c] ?? c).join(", ")})`
      : "";
    return `${ator} ${feito}${alvo}${campos}`;
  }

  const inf = INFINITIVO[l.operacao] ?? l.operacao;
  const objeto = semProduto ? "" : l.operacao === "record_price" ? alvo.replace(" o produto", " do produto") : alvo;
  if (l.resultado === "negado") {
    const motivo = detalhe.escopo_necessario
      ? "sem permissão para isso"
      : detalhe.motivo === "confirmacao_ausente_ou_incorreta"
        ? "faltou a confirmação"
        : "bloqueado";
    return `${ator} tentou ${inf}${objeto}, mas foi barrado (${motivo})`;
  }
  return `${ator} tentou ${inf}${objeto}, mas deu erro${typeof detalhe.erro === "string" ? `: ${detalhe.erro}` : ""}`;
}
