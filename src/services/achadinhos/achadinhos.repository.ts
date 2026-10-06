import type { SupabaseClient } from "@supabase/supabase-js";
import type { EntradaLog, ProdutoAchadinho, StatusProduto } from "@/lib/achadinhos/tipos";

/**
 * Fase 263 — acesso a dados dos Achadinhos. A lógica de negócio
 * (`achadinhos.operacoes.ts`) só conhece esta interface, nunca o Supabase —
 * por isso dá pra testá-la inteira com um repositório em memória, e a
 * mesma lógica serve o painel (client com sessão, RLS) e a API do Claude
 * (service role, sempre filtrando por `loja_id`).
 */

export interface FiltroListagem {
  status?: StatusProduto;
  categoria?: string;
  busca?: string;
  incluirExcluidos?: boolean;
  limite?: number;
  offset?: number;
}

export interface AchadinhosRepository {
  listar(filtro: FiltroListagem): Promise<ProdutoAchadinho[]>;
  buscarPorId(id: string): Promise<ProdutoAchadinho | null>;
  buscarPorSlug(slug: string): Promise<ProdutoAchadinho | null>;
  slugExiste(slug: string): Promise<boolean>;
  inserir(dados: Partial<ProdutoAchadinho>): Promise<ProdutoAchadinho>;
  atualizar(id: string, dados: Partial<ProdutoAchadinho>): Promise<ProdutoAchadinho>;
  registrarLog(entrada: EntradaLog): Promise<void>;
}

export class ErroSlugDuplicado extends Error {
  constructor() {
    super("Já existe um produto com esse slug");
    this.name = "ErroSlugDuplicado";
  }
}

const TABELA = "achadinhos_produtos";

/** Remove tudo que tem significado na sintaxe de filtro do PostgREST (vírgula, parênteses, aspas, curingas). */
export function sanitizarBusca(busca: string): string {
  return busca.replace(/[^\p{L}\p{N}\s.-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export function criarRepositorioSupabase(client: SupabaseClient, lojaId: string): AchadinhosRepository {
  return {
    async listar(filtro) {
      const limite = Math.min(Math.max(filtro.limite ?? 50, 1), 1000);
      const offset = Math.max(filtro.offset ?? 0, 0);
      let q = client.from(TABELA).select("*").eq("loja_id", lojaId);
      if (!filtro.incluirExcluidos) q = q.is("excluido_em", null);
      if (filtro.status) q = q.eq("status", filtro.status);
      if (filtro.categoria) q = q.eq("categoria", filtro.categoria);
      if (filtro.busca) {
        const b = sanitizarBusca(filtro.busca);
        if (b) q = q.or(`nome.ilike.%${b}%,categoria.ilike.%${b}%,slug.ilike.%${b}%`);
      }
      const { data, error } = await q
        .order("destaque", { ascending: false })
        .order("ordem", { ascending: true })
        .order("created_at", { ascending: false })
        .range(offset, offset + limite - 1);
      if (error) throw new Error(error.message);
      return (data ?? []) as ProdutoAchadinho[];
    },

    async buscarPorId(id) {
      const { data, error } = await client.from(TABELA).select("*").eq("id", id).eq("loja_id", lojaId).maybeSingle();
      if (error) throw new Error(error.message);
      return (data as ProdutoAchadinho | null) ?? null;
    },

    async buscarPorSlug(slug) {
      const { data, error } = await client.from(TABELA).select("*").eq("slug", slug).eq("loja_id", lojaId).maybeSingle();
      if (error) throw new Error(error.message);
      return (data as ProdutoAchadinho | null) ?? null;
    },

    async slugExiste(slug) {
      const { count, error } = await client
        .from(TABELA).select("id", { count: "exact", head: true }).eq("slug", slug).eq("loja_id", lojaId);
      if (error) throw new Error(error.message);
      return (count ?? 0) > 0;
    },

    async inserir(dados) {
      const { data, error } = await client.from(TABELA).insert({ ...dados, loja_id: lojaId }).select("*").single();
      if (error) {
        if (error.code === "23505") throw new ErroSlugDuplicado();
        throw new Error(error.message);
      }
      return data as ProdutoAchadinho;
    },

    async atualizar(id, dados) {
      const { data, error } = await client.from(TABELA).update(dados).eq("id", id).eq("loja_id", lojaId).select("*").single();
      if (error) throw new Error(error.message);
      return data as ProdutoAchadinho;
    },

    async registrarLog(e) {
      const { error } = await client.from("achadinhos_log").insert({
        loja_id: lojaId,
        ator_tipo: e.ator.tipo,
        ator_nome: e.ator.nome,
        ator_id: e.ator.id ?? null,
        operacao: e.operacao,
        produto_id: e.produto_id,
        produto_nome: e.produto_nome,
        resultado: e.resultado,
        detalhe: e.detalhe ?? null,
      });
      if (error) throw new Error(error.message);
    },
  };
}
