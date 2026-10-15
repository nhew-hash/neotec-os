import { createClient } from "@/lib/supabase/server";
import { condicoesDoTermo, corresponde, finalDoImei, numerarUnidades, paginar, rotuloAparelho, termosDaBusca, type ItemBusca } from "./itens-busca";

const LIMITE_CANDIDATOS = 600; // por tipo; se estourar, avisamos para refinar (nunca cortamos em silêncio)
const CATEGORIAS_FORA = ["iphone", "android", "peca"]; // aparelhos vendem por unidade; peça é consumo interno
const seguro = (t: string) => t.replace(/[,()%*_\\"'`;:]/g, "");

export interface ResultadoItens { itens: ItemBusca[]; temMais: boolean; truncado: boolean }

/**
 * Candidatos no servidor, filtro final por TODOS os termos em `corresponde`.
 * Custos nunca são lidos: aparelhos vêm de `vw_aparelhos_seguro` e produtos de `vw_produtos_seguro`,
 * e só as colunas necessárias são selecionadas.
 */
export async function buscarItens(params: { q: string; pagina?: number; limite?: number }): Promise<ResultadoItens> {
  const limite = Math.min(Math.max(params.limite ?? 10, 1), 30);
  const pagina = Math.max(Math.trunc(params.pagina ?? 0), 0);
  const termos = termosDaBusca(params.q).map(seguro).filter(Boolean);
  const supabase = await createClient();
  let truncado = false;

  // ---- Aparelhos disponíveis
  let idsProdutoPorTermo: string[] = [];
  if (termos.length > 0) {
    const filtroNome = termos.flatMap((t) => [`nome.ilike.%${t}%`, `modelo.ilike.%${t}%`, `marca.ilike.%${t}%`]).join(",");
    const { data: ps, error } = await supabase.from("vw_produtos_seguro").select("id").or(filtroNome).limit(400);
    if (error) throw new Error(`Não foi possível buscar os modelos: ${error.message}`);
    idsProdutoPorTermo = (ps ?? []).map((p) => p.id);
  }
  let qa = supabase.from("vw_aparelhos_seguro").select("id, produto_id, imei, cor, memoria, condicao, preco_venda, preco_liquido_desejado").eq("status", "disponivel").gt("preco_venda", 0);
  if (termos.length > 0) {
    const partes = termos.flatMap((t) => [`cor.ilike.%${t}%`, `memoria.ilike.%${t}%`, `imei.ilike.%${t}%`, ...condicoesDoTermo(t).map((c) => `condicao.eq.${c}`)]);
    if (idsProdutoPorTermo.length > 0) partes.push(`produto_id.in.(${idsProdutoPorTermo.join(",")})`);
    qa = qa.or(partes.join(","));
  }
  const { data: aparelhos, error: erroA } = await qa.limit(LIMITE_CANDIDATOS);
  if (erroA) throw new Error(`Não foi possível buscar os aparelhos: ${erroA.message}`);
  if ((aparelhos?.length ?? 0) >= LIMITE_CANDIDATOS) truncado = true;

  const idsProdutos = [...new Set((aparelhos ?? []).map((a) => a.produto_id))];
  const nomes = new Map<string, string>();
  if (idsProdutos.length > 0) {
    const { data } = await supabase.from("vw_produtos_seguro").select("id, nome").in("id", idsProdutos);
    for (const p of data ?? []) nomes.set(p.id, p.nome);
  }
  const itensAparelho: ItemBusca[] = (aparelhos ?? [])
    .map((a): ItemBusca => ({ tipo: "aparelho", id: a.id, rotulo: rotuloAparelho({ nome: nomes.get(a.produto_id), memoria: a.memoria, cor: a.cor, condicao: a.condicao }), preco: Number(a.preco_liquido_desejado ?? a.preco_venda), detalhe: finalDoImei(a.imei) }))
    .filter((i, idx) => corresponde([i.rotulo, (aparelhos ?? [])[idx]?.imei], termos));

  // ---- Acessórios e demais produtos (por unidade, com saldo)
  let qp = supabase.from("vw_produtos_seguro").select("id, nome, marca, modelo, categoria, preco_venda, preco_liquido_desejado").eq("status", "ativo").gt("preco_venda", 0);
  for (const t of termos) qp = qp.or(`nome.ilike.%${t}%,modelo.ilike.%${t}%,marca.ilike.%${t}%,categoria.ilike.%${t}%`);
  const { data: produtos, error: erroP } = await qp.order("nome").limit(LIMITE_CANDIDATOS);
  if (erroP) throw new Error(`Não foi possível buscar os produtos: ${erroP.message}`);
  if ((produtos?.length ?? 0) >= LIMITE_CANDIDATOS) truncado = true;
  const candidatos = (produtos ?? []).filter((p) => !CATEGORIAS_FORA.includes(String(p.categoria).toLowerCase()));
  const saldos = new Map<string, number>();
  if (candidatos.length > 0) {
    const { data } = await supabase.from("vw_produtos_saldo").select("produto_id, saldo").in("produto_id", candidatos.map((p) => p.id));
    for (const s of data ?? []) saldos.set(s.produto_id, Number(s.saldo));
  }
  const itensProduto: ItemBusca[] = candidatos
    .filter((p) => (saldos.get(p.id) ?? 0) > 0 && corresponde([p.nome, p.marca, p.modelo, p.categoria], termos))
    .map((p) => ({ tipo: "produto", id: p.id, rotulo: p.nome, preco: Number(p.preco_liquido_desejado ?? p.preco_venda), detalhe: `${saldos.get(p.id)} em estoque` }));

  const todos = [...numerarUnidades(itensAparelho).sort((a, b) => a.rotulo.localeCompare(b.rotulo, "pt-BR")), ...itensProduto];
  const { pagina: fatia, temMais } = paginar(todos, pagina, limite);
  return { itens: fatia, temMais, truncado };
}
