import { createClient } from "@/lib/supabase/server";
import { finalDoTelefone, interpretarBuscaCliente } from "@/lib/telefone";
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

interface FiltrosClientes {
  busca?: string;
  nivel?: Cliente["nivel"];
  origem?: Cliente["origem"];
}

/**
 * Aplica a busca de forma SEGURA e tolerante a formatação:
 * - antes, o termo era interpolado direto em `.or(nome.ilike.%termo%,...)` do
 *   PostgREST: vírgula/parêntese no texto quebrava a busca (ou alterava o
 *   filtro) e "(34) 99999-1234" não achava "34999991234";
 * - agora reaproveita `interpretarBuscaCliente` (mesma regra da Central
 *   Comercial): palavras → nome, trechos numéricos → telefone; telefone
 *   completo casa pelos 8 últimos dígitos (com ou sem o 9º dígito/DDD).
 * Um termo que não é nome nem telefone (e-mail, CPF com pontuação) ainda
 * busca em e-mail/CPF, sem caracteres especiais do PostgREST.
 */
function aplicarFiltrosClientes<Q extends { ilike: (c: string, v: string) => Q; eq: (c: string, v: string) => Q; or: (f: string) => Q }>(query: Q, params?: FiltrosClientes): Q {
  const termo = params?.busca?.trim() ?? "";
  if (termo) {
    if (termo.includes("@")) {
      query = query.ilike("email", `%${termo.replace(/[,()%*\\"'`;:]/g, "")}%`);
    } else {
      const { nomes, digitos } = interpretarBuscaCliente(termo);
      for (const n of nomes) query = query.ilike("nome", `%${n}%`);
      for (const d of digitos) {
        const trecho = d.length >= 10 ? finalDoTelefone(d) : d;
        // Telefone OU CPF (CPF é guardado só com dígitos ou com máscara; os dois casam pelo trecho).
        query = d.length === 11 && nomes.length === 0
          ? query.or(`whatsapp.ilike.%${trecho}%,cpf.ilike.%${d}%`)
          : query.ilike("whatsapp", `%${trecho}%`);
      }
    }
  }
  if (params?.nivel) query = query.eq("nivel", params.nivel);
  if (params?.origem) query = query.eq("origem", params.origem);
  return query;
}

export async function listarClientes(params?: FiltrosClientes): Promise<Cliente[]> {
  const supabase = await createClient();

  const query = aplicarFiltrosClientes(
    supabase.from("clientes").select("*").order("data_cadastro", { ascending: false }),
    params
  );

  const { data, error } = await query;

  if (error) {
    throw new Error(`Não foi possível carregar os clientes: ${error.message}`);
  }

  return data ?? [];
}

/** Listagem paginada NO BANCO (antes a tela de Clientes baixava a base inteira e paginava em memória). */
export async function listarClientesPaginado(params: FiltrosClientes & { pagina: number; porPagina: number }): Promise<{ clientes: Cliente[]; total: number }> {
  const supabase = await createClient();
  const pagina = Math.max(1, Math.trunc(params.pagina) || 1);
  const de = (pagina - 1) * params.porPagina;

  const query = aplicarFiltrosClientes(
    supabase.from("clientes").select("*", { count: "exact" }).order("data_cadastro", { ascending: false }),
    params
  ).range(de, de + params.porPagina - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`Não foi possível carregar os clientes: ${error.message}`);
  return { clientes: data ?? [], total: count ?? 0 };
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
    // Já existe cliente com esse WhatsApp — em vez de estourar o erro
    // cru do banco (confuso pra quem tá usando o sistema), busca e
    // devolve o cliente que já existe. Faz sentido em praticamente
    // todo lugar que chama essa função: automação de WhatsApp, PDV,
    // cadastro manual — nenhum desses quer travar só porque o cliente
    // já tinha sido cadastrado antes, quer é seguir usando o registro certo.
    if (error.code === "23505" && input.whatsapp) {
      const { data: existente, error: erroBusca } = await supabase
        .from("clientes")
        .select("*")
        .eq("whatsapp", normalizarInput(input).whatsapp)
        .maybeSingle();

      if (existente) return existente;
      if (erroBusca) throw new Error(`Cliente com esse WhatsApp já existe, mas não consegui recuperar os dados: ${erroBusca.message}`);
    }

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
