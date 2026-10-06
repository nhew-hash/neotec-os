import { parseCurrencyBRL } from "@/utils/format";
import type { InformacaoProduto, ProdutoAchadinho, StatusProduto } from "./tipos";

/** O que o formulário do painel guarda: tudo texto, como a pessoa digitou. */
export interface FormularioProduto {
  nome: string;
  link_afiliado: string;
  preco_atual: string;
  preco_anterior: string;
  desconto_percentual: string;
  imagem_principal: string;
  imagens: string; // uma URL por linha
  video_url: string;
  descricao: string;
  categoria: string;
  tags: string; // separadas por vírgula
  selo: string;
  score: string;
  ordem: string;
  destaque: boolean;
  informacoes: InformacaoProduto[];
  observacoes: string;
  seo_titulo: string;
  seo_descricao: string;
  imagem_og: string;
  status: StatusProduto;
}

export const FORMULARIO_VAZIO: FormularioProduto = {
  nome: "", link_afiliado: "", preco_atual: "", preco_anterior: "", desconto_percentual: "",
  imagem_principal: "", imagens: "", video_url: "", descricao: "", categoria: "", tags: "", selo: "",
  score: "", ordem: "", destaque: false, informacoes: [], observacoes: "", seo_titulo: "", seo_descricao: "",
  imagem_og: "", status: "rascunho",
};

const brl = (n: number | null) => (n == null ? "" : n.toFixed(2).replace(".", ","));

export function produtoParaFormulario(p: ProdutoAchadinho): FormularioProduto {
  return {
    nome: p.nome, link_afiliado: p.link_afiliado,
    preco_atual: brl(p.preco_atual), preco_anterior: brl(p.preco_anterior),
    desconto_percentual: p.desconto_percentual == null ? "" : String(p.desconto_percentual).replace(".", ","),
    imagem_principal: p.imagem_principal ?? "", imagens: p.imagens.join("\n"), video_url: p.video_url ?? "",
    descricao: p.descricao ?? "", categoria: p.categoria ?? "", tags: p.tags.join(", "), selo: p.selo ?? "",
    score: String(p.score), ordem: String(p.ordem), destaque: p.destaque,
    informacoes: p.informacoes.map((i) => ({ ...i })), observacoes: p.observacoes ?? "",
    seo_titulo: p.seo_titulo ?? "", seo_descricao: p.seo_descricao ?? "", imagem_og: p.imagem_og ?? "",
    status: p.status,
  };
}

/** Sugestão de desconto a partir dos dois preços — só preenche o campo; a pessoa aplica. */
export function descontoSugerido(precoAtual: string, precoAnterior: string): number | null {
  const a = parseCurrencyBRL(precoAtual);
  const b = parseCurrencyBRL(precoAnterior);
  if (a == null || b == null || b <= 0 || a >= b) return null;
  return Math.round((1 - a / b) * 100);
}

export type ConversaoFormulario = { ok: true; entrada: Record<string, unknown> } | { ok: false; erro: string };

const texto = (s: string) => s.trim() || null;

function numero(s: string, campo: string, moeda: boolean): { ok: true; v: number | null } | { ok: false; erro: string } {
  const t = s.trim();
  if (!t) return { ok: true, v: null };
  // parseCurrencyBRL ignora letras ("abc1x2" viraria 12) — aqui só aceita o que parece dinheiro mesmo.
  if (moeda && !/^(R\$)?\s*[\d.,]+$/i.test(t)) return { ok: false, erro: `${campo}: valor inválido` };
  const v = moeda ? parseCurrencyBRL(t) : Number(t.replace(",", "."));
  if (v == null || !Number.isFinite(v)) return { ok: false, erro: `${campo}: valor inválido` };
  return { ok: true, v };
}

/** Converte o formulário na entrada das operações (as mesmas que o Claude usa). Campos vazios viram `null` pra poder limpar. */
export function formularioParaEntrada(f: FormularioProduto, modo: "criar" | "editar"): ConversaoFormulario {
  const pa = numero(f.preco_atual, "Preço atual", true);
  const pr = numero(f.preco_anterior, "Preço anterior", true);
  const de = numero(f.desconto_percentual, "Desconto", false);
  const sc = numero(f.score, "Score", false);
  const or = numero(f.ordem, "Ordem", false);
  for (const r of [pa, pr, de, sc, or]) if (!r.ok) return { ok: false, erro: r.erro };

  const entrada: Record<string, unknown> = {
    nome: f.nome.trim(),
    link_afiliado: f.link_afiliado.trim(),
    descricao: texto(f.descricao),
    categoria: texto(f.categoria),
    imagem_principal: texto(f.imagem_principal),
    imagens: f.imagens.split("\n").map((l) => l.trim()).filter(Boolean),
    video_url: texto(f.video_url),
    preco_atual: pa.ok ? pa.v : null,
    preco_anterior: pr.ok ? pr.v : null,
    desconto_percentual: de.ok ? de.v : null,
    tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean),
    destaque: f.destaque,
    selo: texto(f.selo),
    informacoes: f.informacoes
      .map((i) => ({ rotulo: i.rotulo.trim(), valor: i.valor.trim() }))
      .filter((i) => i.rotulo || i.valor),
    observacoes: texto(f.observacoes),
    seo_titulo: texto(f.seo_titulo),
    seo_descricao: texto(f.seo_descricao),
    imagem_og: texto(f.imagem_og),
  };
  if (sc.ok && sc.v != null) entrada.score = sc.v;
  if (or.ok && or.v != null) entrada.ordem = or.v;
  if (modo === "criar") entrada.status = f.status;
  return { ok: true, entrada };
}
