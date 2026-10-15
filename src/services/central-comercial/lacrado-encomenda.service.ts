import { createClient } from "@/lib/supabase/server";
import { rotuloAparelho } from "./itens-busca";

/**
 * Lacrado vendido ANTES de chegar (encomenda): o PDV só vende `aparelhos` com
 * status "disponivel". Ao salvar a proposta, o lacrado escolhido (variante do
 * catálogo de lacrados) vira um aparelho "novo · no fornecedor" — o mesmo jeito
 * que os seminovos da lista de fornecedor já entram. Fora da loja virtual.
 *
 * - Usa a sessão de quem está logado: o RLS de `aparelhos` só deixa admin/gerente
 *   cadastrar; vendedora recebe a mensagem para pedir à gerência.
 * - Custo é obrigatório e vem do preço do fornecedor da lista importada; sem ele
 *   não cadastra (não inventa custo).
 * - Reaproveita um aparelho de encomenda igual que não esteja em outra proposta
 *   aberta, para propostas recusadas não acumularem unidades fantasmas.
 */
const MARCA_ENCOMENDA = "Lacrado sob encomenda";
const STATUS_ABERTOS = ["criado", "enviado", "visualizado"];

type Supa = Awaited<ReturnType<typeof createClient>>;

interface VarianteLacrado {
  id: string; modelo_id: string; cor: string; armazenamento: string; quantidade: number; preco_venda: number | null; ativo: boolean;
  banco_imagens_grupo_id: string | null;
  modelo: { nome: string; marca: string | null; banco_imagens_grupo_id: string | null } | null;
}

async function carregarVariante(supabase: Supa, varianteId: string): Promise<VarianteLacrado> {
  const { data, error } = await supabase
    .from("catalogo_lacrados_variantes")
    .select("id, modelo_id, cor, armazenamento, quantidade, preco_venda, ativo, banco_imagens_grupo_id, modelo:catalogo_lacrados_modelos(nome, marca, banco_imagens_grupo_id)")
    .eq("id", varianteId)
    .maybeSingle();
  if (error) throw new Error(`Não foi possível ler o lacrado: ${error.message}`);
  if (!data) throw new Error("Lacrado não encontrado no catálogo.");
  return data as unknown as VarianteLacrado;
}

/** Para a proposta (sem gravar nada): descrição, preço e se está disponível. */
export async function lacradoParaProposta(varianteId: string): Promise<{ descricao: string; preco: number }> {
  const supabase = await createClient();
  const v = await carregarVariante(supabase, varianteId);
  if (!v.ativo || v.quantidade <= 0) throw new Error("Este lacrado não está mais disponível no fornecedor.");
  const preco = Number(v.preco_venda);
  if (!preco || preco <= 0) throw new Error("Este lacrado está sem preço de venda.");
  return { preco, descricao: `${rotuloAparelho({ nome: v.modelo?.nome, memoria: v.armazenamento, cor: v.cor, condicao: "novo" })} · Lacrado (encomenda)` };
}

/** Menor preço de fornecedor ativo para a variante (o custo real da encomenda). */
export async function custoDoLacrado(varianteId: string, supabase?: Supa): Promise<number | null> {
  const s = supabase ?? (await createClient());
  const { data, error } = await s.from("import_itens_ativos").select("preco_fornecedor").eq("variante_lacrado_id", varianteId).eq("ativo", true);
  if (error) throw new Error(`Não foi possível ler o custo do fornecedor: ${error.message}`);
  const precos = (data ?? []).map((d) => Number(d.preco_fornecedor)).filter((n) => n > 0);
  return precos.length ? Math.min(...precos) : null;
}

export function categoriaDoModeloLacrado(nome: string): "iphone" | "ipad" | "apple_watch" | "notebook" | "smartphone" {
  const n = nome.toLowerCase();
  if (/iphone/.test(n)) return "iphone";
  if (/\bipad\b/.test(n)) return "ipad";
  if (/apple\s*watch/.test(n)) return "apple_watch";
  if (/macbook|\bimac\b|mac\s*(mini|studio)/.test(n)) return "notebook";
  return "smartphone";
}

/**
 * Garante o aparelho de encomenda e devolve o id. `orcamentoAtualId` permite
 * reaproveitar o aparelho que já está nesta mesma proposta (ao regravar).
 */
export async function materializarLacrado(varianteId: string, orcamentoAtualId: string | null): Promise<string> {
  const supabase = await createClient();
  const v = await carregarVariante(supabase, varianteId);
  if (!v.ativo || v.quantidade <= 0) throw new Error("Este lacrado não está mais disponível no fornecedor.");
  const preco = Number(v.preco_venda);
  if (!preco || preco <= 0) throw new Error("Este lacrado está sem preço de venda.");
  const nomeModelo = v.modelo?.nome?.trim();
  if (!nomeModelo) throw new Error("Lacrado sem modelo no catálogo.");

  // Produto do modelo (reaproveita o que existir com o mesmo nome).
  let { data: produto, error: erroProd } = await supabase.from("produtos").select("id").eq("nome", nomeModelo).limit(1).maybeSingle();
  if (erroProd) throw new Error(`Não foi possível ler o produto: ${erroProd.message}`);
  if (!produto) {
    const { data: novo, error } = await supabase.from("produtos")
      .insert({ nome: nomeModelo, marca: v.modelo?.marca ?? null, categoria: categoriaDoModeloLacrado(nomeModelo), visivel_loja: false })
      .select("id").single();
    if (error) throw new Error(error.code === "42501" ? "Só a gerência pode incluir lacrado sob encomenda na proposta. Peça para a gerente incluir." : `Não foi possível cadastrar o modelo: ${error.message}`);
    produto = novo;
  }

  // Reaproveita uma unidade de encomenda igual que não esteja em outra proposta aberta.
  const { data: candidatos, error: erroCand } = await supabase.from("aparelhos").select("id")
    .eq("produto_id", produto!.id).eq("condicao", "novo").eq("status", "disponivel").eq("localizacao_estoque", "fornecedor")
    .eq("cor", v.cor).eq("memoria", v.armazenamento).like("observacoes", `${MARCA_ENCOMENDA}%`).limit(20);
  if (erroCand) throw new Error(`Não foi possível conferir o estoque de encomenda: ${erroCand.message}`);
  if (candidatos && candidatos.length > 0) {
    const ids = candidatos.map((c) => c.id);
    const { data: emUso } = await supabase.from("orcamento_itens").select("aparelho_id, orcamento:orcamentos!inner(id, status)").in("aparelho_id", ids);
    const ocupados = new Set((emUso ?? [])
      .filter((u) => { const o = u.orcamento as unknown as { id: string; status: string }; return STATUS_ABERTOS.includes(o.status) && o.id !== orcamentoAtualId; })
      .map((u) => u.aparelho_id));
    const livre = ids.find((id) => !ocupados.has(id));
    if (livre) return livre;
  }

  const custo = await custoDoLacrado(varianteId, supabase);
  if (custo === null) throw new Error(`Sem custo do fornecedor para "${nomeModelo} ${v.armazenamento} ${v.cor}". Cadastre o lacrado no Estoque antes de vender sob encomenda.`);

  const { data: aparelho, error } = await supabase.from("aparelhos").insert({
    produto_id: produto!.id, condicao: "novo", status: "disponivel", localizacao_estoque: "fornecedor", origem_entrada: "fornecedor",
    cor: v.cor, memoria: v.armazenamento, custo, preco_venda: preco, disponivel_loja_virtual: false,
    banco_imagens_grupo_id: v.banco_imagens_grupo_id ?? v.modelo?.banco_imagens_grupo_id ?? null,
    observacoes: `${MARCA_ENCOMENDA} — criado pela proposta da Central comercial. Chega do fornecedor; cadastrar o IMEI na chegada.`,
  }).select("id").single();
  if (error) throw new Error(error.code === "42501" ? "Só a gerência pode incluir lacrado sob encomenda na proposta. Peça para a gerente incluir." : `Não foi possível cadastrar o lacrado de encomenda: ${error.message}`);
  return aparelho.id;
}
