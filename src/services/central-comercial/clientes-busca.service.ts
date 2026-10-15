import { createClient } from "@/lib/supabase/server";
import { finalDoTelefone, interpretarBuscaCliente, normalizarTelefone } from "@/lib/telefone";

/**
 * Busca de clientes NO SERVIDOR para a proposta: nome e/ou telefone, paginada.
 * Nunca devolve a base inteira — no máximo `limite` por página.
 * Não devolve CPF, e-mail nem endereço: só o necessário para escolher o cliente certo.
 */
export interface ClienteResultado {
  id: string;
  nome: string;
  whatsapp: string;
  cidade: string | null;
  clienteDesde: string | null;
  orcamentosAbertos: number;
}

const STATUS_ABERTOS = ["criado", "enviado", "visualizado"];
export const LIMITE_PADRAO = 8;

export async function buscarClientes(params: { q: string; pagina?: number; limite?: number }): Promise<{ itens: ClienteResultado[]; temMais: boolean }> {
  const limite = Math.min(Math.max(params.limite ?? LIMITE_PADRAO, 1), 20);
  const pagina = Math.max(Math.trunc(params.pagina ?? 0), 0);
  const { nomes, digitos } = interpretarBuscaCliente(params.q);

  const supabase = await createClient();
  let query = supabase.from("clientes").select("id, nome, whatsapp, cidade, data_cadastro");

  if (nomes.length === 0 && digitos.length === 0) {
    // Sem termo: os cadastros mais recentes, para a vendedora não começar de uma tela vazia.
    query = query.order("data_cadastro", { ascending: false });
  } else {
    for (const n of nomes) query = query.ilike("nome", `%${n}%`);
    for (const d of digitos) query = query.ilike("whatsapp", `%${d}%`);
    query = query.order("nome", { ascending: true });
  }

  const de = pagina * limite;
  const { data, error } = await query.range(de, de + limite); // um a mais, só para saber se há próxima página
  if (error) throw new Error(`Não foi possível buscar os clientes: ${error.message}`);
  const linhas = data ?? [];
  const temMais = linhas.length > limite;
  const pagina_ = linhas.slice(0, limite);

  const contagem = new Map<string, number>();
  if (pagina_.length > 0) {
    const { data: orc } = await supabase.from("orcamentos").select("cliente_id").in("cliente_id", pagina_.map((c) => c.id)).in("status", STATUS_ABERTOS);
    for (const o of orc ?? []) contagem.set(o.cliente_id, (contagem.get(o.cliente_id) ?? 0) + 1);
  }

  return {
    temMais,
    itens: pagina_.map((c) => ({
      id: c.id, nome: c.nome, whatsapp: c.whatsapp, cidade: c.cidade ?? null,
      clienteDesde: c.data_cadastro ?? null, orcamentosAbertos: contagem.get(c.id) ?? 0,
    })),
  };
}

export async function obterClienteBasico(id: string): Promise<ClienteResultado | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("clientes").select("id, nome, whatsapp, cidade, data_cadastro").eq("id", id).maybeSingle();
  if (!data) return null;
  return { id: data.id, nome: data.nome, whatsapp: data.whatsapp, cidade: data.cidade ?? null, clienteDesde: data.data_cadastro ?? null, orcamentosAbertos: 0 };
}

export interface CandidatoDuplicado { id: string; nome: string; whatsapp: string; igual: boolean }

/** Procura cadastros com o mesmo telefone (igual) ou com a mesma linha (últimos 8 dígitos: 9º dígito, DDD diferente). */
export async function procurarDuplicados(telefone: string): Promise<CandidatoDuplicado[]> {
  const digitos = normalizarTelefone(telefone);
  if (digitos.length < 8) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("clientes").select("id, nome, whatsapp").ilike("whatsapp", `%${finalDoTelefone(digitos)}`).limit(5);
  if (error) throw new Error(`Não foi possível verificar duplicidade: ${error.message}`);
  return (data ?? []).map((c) => ({ id: c.id, nome: c.nome, whatsapp: c.whatsapp, igual: c.whatsapp === digitos }));
}
