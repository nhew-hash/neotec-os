import { createClient } from "@/lib/supabase/server";
import type { Cliente } from "@/types";

/**
 * Camada de serviço: toda a lógica de acesso ao Supabase para o domínio
 * "clientes" vive aqui. Componentes e Server Actions nunca fazem query
 * direta ao banco — eles chamam estas funções.
 */

interface ClienteInput {
  nome: string;
  whatsapp: string;
  cpf?: string;
  email?: string;
  data_nascimento?: string;
  apple_id?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  origem?: Cliente["origem"];
  aceita_marketing?: boolean;
  observacoes?: string;
}

export async function listarClientes(params?: { busca?: string }): Promise<Cliente[]> {
  const supabase = await createClient();

  let query = supabase
    .from("clientes")
    .select("*")
    .order("data_cadastro", { ascending: false });

  if (params?.busca) {
    query = query.or(`nome.ilike.%${params.busca}%,whatsapp.ilike.%${params.busca}%`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Não foi possível carregar os clientes: ${error.message}`);
  }

  return data ?? [];
}

export async function buscarClientePorId(id: string): Promise<Cliente | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // nenhum registro encontrado
    throw new Error(`Não foi possível carregar o cliente: ${error.message}`);
  }

  return data;
}

export async function contarClientes(): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("clientes")
    .select("*", { count: "exact", head: true });

  if (error) {
    throw new Error(`Não foi possível contar os clientes: ${error.message}`);
  }

  return count ?? 0;
}

/** Clientes com aniversário nos próximos `dias` dias (usado no dashboard). */
export async function listarProximosAniversarios(dias: number = 30): Promise<Cliente[]> {
  const supabase = await createClient();

  // Comparação de mês/dia é feita em memória porque o intervalo pode
  // atravessar a virada do ano (ex: 20/dez a 19/jan) — mais simples e
  // legível do que replicar essa lógica em SQL para o volume atual.
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .not("data_nascimento", "is", null);

  if (error) throw new Error(`Não foi possível carregar aniversariantes: ${error.message}`);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  return (data ?? [])
    .map((cliente) => {
      const nascimento = new Date(cliente.data_nascimento as string);
      const proximo = new Date(hoje.getFullYear(), nascimento.getMonth(), nascimento.getDate());
      if (proximo < hoje) proximo.setFullYear(proximo.getFullYear() + 1);
      const diasRestantes = Math.round((proximo.getTime() - hoje.getTime()) / 86400000);
      return { cliente, diasRestantes };
    })
    .filter((item) => item.diasRestantes <= dias)
    .sort((a, b) => a.diasRestantes - b.diasRestantes)
    .map((item) => item.cliente);
}

function normalizarInput(input: ClienteInput) {
  return {
    nome: input.nome,
    whatsapp: input.whatsapp,
    cpf: input.cpf || null,
    email: input.email || null,
    data_nascimento: input.data_nascimento || null,
    apple_id: input.apple_id || null,
    endereco: input.endereco || null,
    cidade: input.cidade || null,
    estado: input.estado || null,
    origem: input.origem || null,
    aceita_marketing: input.aceita_marketing ?? false,
    observacoes: input.observacoes || null,
  };
}

export async function criarCliente(input: ClienteInput): Promise<Cliente> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("clientes")
    .insert(normalizarInput(input))
    .select("*")
    .single();

  if (error) {
    throw new Error(`Não foi possível criar o cliente: ${error.message}`);
  }

  return data;
}

export async function atualizarCliente(id: string, input: ClienteInput): Promise<Cliente> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clientes")
    .update(normalizarInput(input))
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(`Não foi possível atualizar o cliente: ${error.message}`);
  return data;
}
