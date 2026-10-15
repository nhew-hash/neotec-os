import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/services/lacrados/slugify";
import { detalhesDoAparelho, fotoPrincipalPorGrupo, grupoDaCategoria, type ItemCatalogo } from "./catalogo";
import { formatarCapacidade } from "./itens-busca";

const CATEGORIAS_FORA = ["iphone", "android", "peca"]; // aparelho vende por unidade (vem de `aparelhos`); peça é consumo interno

/**
 * Tudo o que dá para vender agora, do estoque real: aparelhos disponíveis
 * (um card por unidade, com bateria), produtos com saldo e lacrados com
 * unidade e preço. Custos nunca são lidos (views "seguro", só colunas usadas).
 */
export async function listarCatalogoVenda(): Promise<ItemCatalogo[]> {
  const supabase = await createClient();

  const [aparelhosR, produtosR, modelosR, variantesR] = await Promise.all([
    supabase.from("vw_aparelhos_seguro").select("id, produto_id, cor, memoria, bateria, condicao, preco_venda, preco_liquido_desejado, fotos, banco_imagens_grupo_id").eq("status", "disponivel").gt("preco_venda", 0).limit(1000),
    supabase.from("vw_produtos_seguro").select("id, nome, categoria, preco_venda, preco_liquido_desejado, fotos, banco_imagens_grupo_id, slug, visivel_loja, status").limit(2000),
    supabase.from("catalogo_lacrados_modelos").select("id, nome, marca, fotos, banco_imagens_grupo_id").eq("ativo", true),
    supabase.from("catalogo_lacrados_variantes").select("modelo_id, cor, armazenamento, quantidade, preco_venda, banco_imagens_grupo_id").eq("ativo", true).gt("quantidade", 0).not("preco_venda", "is", null),
  ]);
  for (const r of [aparelhosR, produtosR, modelosR, variantesR]) if (r.error) throw new Error(`Não foi possível carregar o catálogo: ${r.error.message}`);

  const produtos = new Map((produtosR.data ?? []).map((p) => [p.id, p]));

  // Fotos do Banco de imagens (a coluna `fotos` costuma estar vazia; a loja usa o grupo).
  const grupos = [...new Set([
    ...(aparelhosR.data ?? []).map((a) => a.banco_imagens_grupo_id),
    ...(produtosR.data ?? []).map((p) => p.banco_imagens_grupo_id),
    ...(modelosR.data ?? []).map((m) => m.banco_imagens_grupo_id),
    ...(variantesR.data ?? []).map((v) => v.banco_imagens_grupo_id),
  ].filter((g): g is string => Boolean(g)))];
  let fotoDoGrupo = new Map<string, string>();
  if (grupos.length > 0) {
    const { data, error } = await supabase.from("banco_imagens_fotos").select("grupo_id, url, ordem, tipo").in("grupo_id", grupos);
    if (error) throw new Error(`Não foi possível carregar as fotos: ${error.message}`);
    fotoDoGrupo = fotoPrincipalPorGrupo(data ?? []);
  }
  const foto = (grupo: string | null | undefined, fotos: string[] | null | undefined) => (grupo ? fotoDoGrupo.get(grupo) : undefined) ?? fotos?.[0] ?? null;

  const itensAparelho: ItemCatalogo[] = (aparelhosR.data ?? []).map((a) => {
    const p = produtos.get(a.produto_id);
    return {
      tipo: "aparelho", id: a.id, nome: p?.nome ?? "Aparelho",
      grupo: grupoDaCategoria(p?.categoria, a.condicao),
      detalhes: detalhesDoAparelho(a),
      preco: Number(a.preco_liquido_desejado ?? a.preco_venda),
      foto: foto(a.banco_imagens_grupo_id, a.fotos) ?? foto(p?.banco_imagens_grupo_id, p?.fotos),
      bateria: a.bateria ?? null,
      vaiParaProposta: true,
      linkLoja: p?.slug && p.visivel_loja ? `/loja/produto/${p.slug}` : null,
      quantidade: 1,
    };
  });

  const candidatos = (produtosR.data ?? []).filter((p) => p.status === "ativo" && Number(p.preco_venda) > 0 && !CATEGORIAS_FORA.includes(String(p.categoria).toLowerCase()));
  const saldos = new Map<string, number>();
  if (candidatos.length > 0) {
    const { data, error } = await supabase.from("vw_produtos_saldo").select("produto_id, saldo").in("produto_id", candidatos.map((p) => p.id));
    if (error) throw new Error(`Não foi possível carregar o saldo dos produtos: ${error.message}`);
    for (const s of data ?? []) saldos.set(s.produto_id, Number(s.saldo));
  }
  const itensProduto: ItemCatalogo[] = candidatos
    .filter((p) => (saldos.get(p.id) ?? 0) > 0)
    .map((p) => ({
      tipo: "produto", id: p.id, nome: p.nome, grupo: grupoDaCategoria(p.categoria),
      detalhes: [`${saldos.get(p.id)} em estoque`],
      preco: Number(p.preco_liquido_desejado ?? p.preco_venda),
      foto: foto(p.banco_imagens_grupo_id, p.fotos), bateria: null, vaiParaProposta: true,
      linkLoja: p.slug && p.visivel_loja ? `/loja/produto/${p.slug}` : null,
      quantidade: saldos.get(p.id) ?? 0,
    }));

  const porModelo = new Map<string, { cor: string; armazenamento: string; quantidade: number; preco_venda: number; banco_imagens_grupo_id: string | null }[]>();
  for (const v of variantesR.data ?? []) porModelo.set(v.modelo_id, [...(porModelo.get(v.modelo_id) ?? []), { ...v, preco_venda: Number(v.preco_venda) }]);
  const itensLacrado: ItemCatalogo[] = (modelosR.data ?? []).flatMap((m) => {
    const vs = porModelo.get(m.id);
    if (!vs?.length) return [];
    const armazenamentos = [...new Set(vs.map((v) => formatarCapacidade(v.armazenamento)).filter((x): x is string => Boolean(x)))];
    const cores = [...new Set(vs.map((v) => v.cor).filter((c) => c && !/^n[aã]o informad|^—$/i.test(c)))];
    return [{
      tipo: "lacrado" as const, id: m.id, nome: m.nome, grupo: "lacrado" as const,
      detalhes: ["Lacrado", ...armazenamentos, cores.length ? `${cores.length} ${cores.length === 1 ? "cor" : "cores"}` : null].filter((x): x is string => Boolean(x)),
      preco: Math.min(...vs.map((v) => v.preco_venda)),
      foto: foto(m.banco_imagens_grupo_id, m.fotos) ?? vs.map((v) => foto(v.banco_imagens_grupo_id, null)).find(Boolean) ?? null, bateria: null, vaiParaProposta: false,
      linkLoja: `/loja/lacrados/${slugify(m.nome)}`,
      quantidade: vs.reduce((acc, v) => acc + v.quantidade, 0),
    }];
  });

  return [...itensAparelho, ...itensLacrado, ...itensProduto].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR") || a.preco - b.preco);
}
