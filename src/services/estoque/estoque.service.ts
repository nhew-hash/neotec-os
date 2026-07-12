import { createClient } from "@/lib/supabase/server";
import type { Produto, Aparelho, StatusAparelho, TesteAparelho } from "@/types";

/**
 * IMPORTANTE: as funções de LEITURA aqui consultam as views mascaradas
 * (vw_produtos_seguro / vw_aparelhos_seguro), não as tabelas base — é o
 * mecanismo que impede o vendedor de ver custo/lucro mesmo via API,
 * decidido lá na fase de banco de dados. As tabelas base só são
 * acessadas em escrita (INSERT/UPDATE), restritas a admin/técnico via RLS.
 */

// ---- Produtos (catálogo) ----

export async function listarProdutos(): Promise<Produto[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("vw_produtos_seguro").select("*").order("nome");
  if (error) throw new Error(`Não foi possível carregar os produtos: ${error.message}`);
  return (data ?? []) as unknown as Produto[];
}

export async function criarProduto(input: {
  categoria: Produto["categoria"];
  marca?: string;
  modelo?: string;
  nome: string;
  descricao?: string;
  preco_venda?: number;
  custo?: number;
}): Promise<Produto> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("produtos")
    .insert({
      categoria: input.categoria,
      marca: input.marca || null,
      modelo: input.modelo || null,
      nome: input.nome,
      descricao: input.descricao || null,
      preco_venda: input.preco_venda ?? null,
      custo: input.custo ?? null,
    })
    .select("*")
    .single();

  if (error) throw new Error(`Não foi possível criar o produto: ${error.message}`);
  return data;
}

// ---- Aparelhos (itens serializados) ----

export interface AparelhoComProduto extends Aparelho {
  produto: Pick<Produto, "id" | "nome" | "categoria"> | null;
}

export async function listarAparelhos(): Promise<AparelhoComProduto[]> {
  const supabase = await createClient();

  const [{ data: aparelhos, error: errAparelhos }, produtos] = await Promise.all([
    supabase.from("vw_aparelhos_seguro").select("*").order("data_entrada", { ascending: false }),
    listarProdutos(),
  ]);

  if (errAparelhos) throw new Error(`Não foi possível carregar os aparelhos: ${errAparelhos.message}`);

  const produtoPorId = new Map(produtos.map((p) => [p.id, p]));

  return (aparelhos ?? []).map((a) => ({
    ...(a as unknown as Aparelho),
    produto: produtoPorId.get((a as unknown as Aparelho).produto_id) ?? null,
  }));
}

export async function buscarAparelhoPorId(id: string): Promise<AparelhoComProduto | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("vw_aparelhos_seguro").select("*").eq("id", id).single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Não foi possível carregar o aparelho: ${error.message}`);
  }

  const aparelho = data as unknown as Aparelho;
  const produtos = await listarProdutos();
  const produto = produtos.find((p) => p.id === aparelho.produto_id) ?? null;

  return { ...aparelho, produto };
}

export async function criarAparelho(input: {
  produto_id: string;
  imei: string;
  numero_serie?: string;
  cor?: string;
  memoria?: string;
  bateria?: number;
  condicao: Aparelho["condicao"];
  custo: number;
  preco_venda?: number;
  preco_minimo?: number;
  preco_sugerido?: number;
  fornecedor?: string;
  origem_entrada: Aparelho["origem_entrada"];
  investidor_id?: string;
}): Promise<Aparelho> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("aparelhos")
    .insert({
      produto_id: input.produto_id,
      imei: input.imei,
      numero_serie: input.numero_serie || null,
      cor: input.cor || null,
      memoria: input.memoria || null,
      bateria: input.bateria ?? null,
      condicao: input.condicao,
      custo: input.custo,
      preco_venda: input.preco_venda ?? null,
      preco_minimo: input.preco_minimo ?? null,
      preco_sugerido: input.preco_sugerido ?? null,
      fornecedor: input.fornecedor || null,
      origem_entrada: input.origem_entrada,
      investidor_id: input.investidor_id || null,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") throw new Error("Já existe um aparelho cadastrado com esse IMEI");
    throw new Error(`Não foi possível cadastrar o aparelho: ${error.message}`);
  }

  await registrarMovimentoAparelho(data.id, "entrada", "Entrada de aparelho no estoque");

  return data;
}

export async function atualizarStatusAparelho(
  id: string,
  status: StatusAparelho,
  usuarioId: string
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("aparelhos").update({ status }).eq("id", id);
  if (error) throw new Error(`Não foi possível atualizar o status: ${error.message}`);

  await registrarMovimentoAparelho(id, "entrada", `Status alterado para "${status}"`, usuarioId);
}

async function registrarMovimentoAparelho(
  aparelhoId: string,
  tipo: "entrada" | "saida",
  motivo: string,
  usuarioId?: string
): Promise<void> {
  const supabase = await createClient();
  await supabase.from("movimentos_estoque").insert({
    aparelho_id: aparelhoId,
    tipo,
    motivo,
    usuario_id: usuarioId ?? null,
  });
}

// ---- Controle de qualidade ----

export async function salvarTesteAparelho(
  aparelhoId: string,
  input: Omit<TesteAparelho, "id" | "aparelho_id" | "data_teste" | "responsavel_id">,
  responsavelId: string
): Promise<TesteAparelho> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("testes_aparelho")
    .insert({ aparelho_id: aparelhoId, ...input, responsavel_id: responsavelId })
    .select("*")
    .single();

  if (error) throw new Error(`Não foi possível salvar o teste: ${error.message}`);

  const todosAprovados = [
    input.face_id, input.camera, input.tela, input.som,
    input.microfone, input.wifi, input.bluetooth, input.carregamento,
  ].every(Boolean);

  if (todosAprovados) {
    await supabase.from("aparelhos").update({ status: "aprovado" }).eq("id", aparelhoId);
  }

  return data;
}

export async function listarTestesPorAparelho(aparelhoId: string): Promise<TesteAparelho[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("testes_aparelho")
    .select("*")
    .eq("aparelho_id", aparelhoId)
    .order("data_teste", { ascending: false });

  if (error) throw new Error(`Não foi possível carregar os testes: ${error.message}`);
  return data ?? [];
}

/**
 * Custo real de um item (produto ou aparelho), obtido via função
 * SECURITY DEFINER — usado apenas no servidor, ao calcular lucro de uma
 * venda. Nunca repassar o retorno desta função para o cliente.
 */
export async function obterCustoItem(params: { produtoId?: string; aparelhoId?: string }): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("obter_custo_produto", {
    p_produto_id: params.produtoId ?? null,
    p_aparelho_id: params.aparelhoId ?? null,
  });

  if (error) throw new Error(`Não foi possível calcular o custo: ${error.message}`);
  return Number(data ?? 0);
}
