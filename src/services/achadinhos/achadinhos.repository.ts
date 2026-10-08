import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CandidatoAchadinho, EntradaLog, EntradaPreco, ProdutoAchadinho, StatusCandidato, StatusProduto,
} from "@/lib/achadinhos/tipos";

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

  // Fase 264 — fábrica (candidatos da captação e histórico de preço).
  /** Produtos (inclusive excluídos) com esses ids de catálogo do ML — pra não captar de novo o que já está no catálogo. */
  produtosPorCatalogoMl(ids: string[]): Promise<ProdutoAchadinho[]>;
  listarCandidatos(filtro: { status?: StatusCandidato; limite?: number }): Promise<CandidatoAchadinho[]>;
  buscarCandidato(id: string): Promise<CandidatoAchadinho | null>;
  candidatosPorCatalogoMl(ids: string[]): Promise<CandidatoAchadinho[]>;
  inserirCandidato(dados: Partial<CandidatoAchadinho>): Promise<CandidatoAchadinho>;
  atualizarCandidato(id: string, dados: Partial<CandidatoAchadinho>): Promise<CandidatoAchadinho>;
  registrarPreco(entrada: EntradaPreco): Promise<void>;
}

export class ErroSlugDuplicado extends Error {
  constructor() {
    super("Já existe um produto com esse slug");
    this.name = "ErroSlugDuplicado";
  }
}

const TABELA = "achadinhos_produtos";
const CANDIDATOS = "achadinhos_candidatos";

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

    async produtosPorCatalogoMl(ids) {
      if (ids.length === 0) return [];
      const { data, error } = await client.from(TABELA).select("*").eq("loja_id", lojaId).in("ml_catalog_id", ids);
      if (error) throw new Error(error.message);
      return (data ?? []) as ProdutoAchadinho[];
    },

    async listarCandidatos(filtro) {
      const limite = Math.min(Math.max(filtro.limite ?? 50, 1), 500);
      let q = client.from(CANDIDATOS).select("*").eq("loja_id", lojaId);
      if (filtro.status) q = q.eq("status", filtro.status);
      const { data, error } = await q
        .order("product_score", { ascending: false, nullsFirst: false })
        .order("criado_em", { ascending: false })
        .limit(limite);
      if (error) throw new Error(error.message);
      return (data ?? []) as CandidatoAchadinho[];
    },

    async buscarCandidato(id) {
      const { data, error } = await client.from(CANDIDATOS).select("*").eq("id", id).eq("loja_id", lojaId).maybeSingle();
      if (error) throw new Error(error.message);
      return (data as CandidatoAchadinho | null) ?? null;
    },

    async candidatosPorCatalogoMl(ids) {
      if (ids.length === 0) return [];
      const { data, error } = await client.from(CANDIDATOS).select("*").eq("loja_id", lojaId).in("ml_catalog_id", ids);
      if (error) throw new Error(error.message);
      return (data ?? []) as CandidatoAchadinho[];
    },

    async inserirCandidato(dados) {
      const { data, error } = await client.from(CANDIDATOS).insert({ ...dados, loja_id: lojaId }).select("*").single();
      if (error) throw new Error(error.message);
      return data as CandidatoAchadinho;
    },

    async atualizarCandidato(id, dados) {
      const { data, error } = await client.from(CANDIDATOS).update(dados).eq("id", id).eq("loja_id", lojaId).select("*").single();
      if (error) throw new Error(error.message);
      return data as CandidatoAchadinho;
    },

    async registrarPreco(e) {
      const { error } = await client.from("achadinhos_precos").insert({ ...e, loja_id: lojaId });
      if (error) throw new Error(error.message);
    },
  };
}
