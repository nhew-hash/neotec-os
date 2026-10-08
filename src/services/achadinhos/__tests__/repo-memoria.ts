import { randomUUID } from "crypto";
import type { CandidatoAchadinho, EntradaLog, EntradaPreco, ProdutoAchadinho } from "@/lib/achadinhos/tipos";
import { ErroSlugDuplicado, type AchadinhosRepository } from "../achadinhos.repository";

/** Repositório em memória — mesmo contrato do Supabase, pra testar a lógica de negócio sem banco. */
export function criarRepoMemoria() {
  const produtos: ProdutoAchadinho[] = [];
  const logs: EntradaLog[] = [];
  const candidatos: CandidatoAchadinho[] = [];
  const precos: EntradaPreco[] = [];
  const cliques: { produto_slug: string; utm_content: string | null; utm_campaign: string | null; criado_em: string }[] = [];
  const falhas = { log: false };

  const repo: AchadinhosRepository = {
    async listar(f) {
      let lista = produtos.filter((p) => (f.incluirExcluidos ? true : !p.excluido_em));
      if (f.status) lista = lista.filter((p) => p.status === f.status);
      if (f.categoria) lista = lista.filter((p) => p.categoria === f.categoria);
      if (f.busca) {
        const b = f.busca.toLowerCase();
        lista = lista.filter((p) => [p.nome, p.categoria ?? "", p.slug].some((t) => t.toLowerCase().includes(b)));
      }
      lista = [...lista].sort(
        (a, b) => Number(b.destaque) - Number(a.destaque) || a.ordem - b.ordem || b.created_at.localeCompare(a.created_at)
      );
      const offset = f.offset ?? 0;
      return lista.slice(offset, offset + (f.limite ?? 50)).map((p) => ({ ...p }));
    },
    async buscarPorId(id) {
      const p = produtos.find((x) => x.id === id);
      return p ? { ...p } : null;
    },
    async buscarPorSlug(slug) {
      const p = produtos.find((x) => x.slug === slug);
      return p ? { ...p } : null;
    },
    async slugExiste(slug) {
      return produtos.some((p) => p.slug === slug);
    },
    async inserir(dados) {
      if (produtos.some((p) => p.slug === dados.slug)) throw new ErroSlugDuplicado();
      const agora = new Date(Date.now() + produtos.length).toISOString();
      const p: ProdutoAchadinho = {
        id: randomUUID(), loja_id: "loja-1", nome: "", slug: "", descricao: null, categoria: null,
        imagem_principal: null, imagens: [], video_url: null, preco_atual: null, preco_anterior: null,
        desconto_percentual: null, link_afiliado: "", origem: "mercado_livre", tags: [], status: "rascunho",
        destaque: false, selo: null, score: 0, ordem: 0, informacoes: [], observacoes: null,
        seo_titulo: null, seo_descricao: null, imagem_og: null, cliques: 0, vendas: 0, comissao: null,
        receita: null, custo_midia: null, roas: null, ctr: null, cpc: null, status_performance: null,
        excluido_em: null, created_at: agora, updated_at: agora,
        ...dados,
      } as ProdutoAchadinho;
      produtos.push(p);
      return { ...p };
    },
    async atualizar(id, dados) {
      const i = produtos.findIndex((p) => p.id === id);
      if (i < 0) throw new Error("não encontrado");
      produtos[i] = { ...produtos[i], ...dados, updated_at: new Date().toISOString() };
      return { ...produtos[i] };
    },
    async registrarLog(entrada) {
      if (falhas.log) throw new Error("log fora do ar");
      logs.push(entrada);
    },
    async produtosPorCatalogoMl(ids) {
      return produtos.filter((p) => p.ml_catalog_id && ids.includes(p.ml_catalog_id)).map((p) => ({ ...p }));
    },
    async listarCandidatos(f) {
      return candidatos
        .filter((c) => !f.status || c.status === f.status)
        .sort((a, b) => (b.product_score ?? -1) - (a.product_score ?? -1) || b.criado_em.localeCompare(a.criado_em))
        .slice(0, f.limite ?? 50)
        .map((c) => ({ ...c }));
    },
    async buscarCandidato(id) {
      const c = candidatos.find((x) => x.id === id);
      return c ? { ...c } : null;
    },
    async candidatosPorCatalogoMl(ids) {
      return candidatos.filter((c) => ids.includes(c.ml_catalog_id)).map((c) => ({ ...c }));
    },
    async inserirCandidato(dados) {
      if (candidatos.some((c) => c.ml_catalog_id === dados.ml_catalog_id)) throw new Error("duplicate key (loja_id, ml_catalog_id)");
      const agora = new Date(Date.now() + candidatos.length).toISOString();
      const c: CandidatoAchadinho = {
        id: randomUUID(), loja_id: "loja-1", ml_catalog_id: "", ml_item_id: null, nome: "", categoria: null, preco: null,
        preco_anterior_oficial: null, fotos: [], tem_video: false, url_produto: null, status: "ENCONTRADO",
        product_score: null, classe: null, notas: null, motivos: null, motivo_descarte: null, link_afiliado: null,
        produto_id: null, criado_em: agora, atualizado_em: agora,
        ...dados,
      } as CandidatoAchadinho;
      candidatos.push(c);
      return { ...c };
    },
    async atualizarCandidato(id, dados) {
      const i = candidatos.findIndex((c) => c.id === id);
      if (i < 0) throw new Error("não encontrado");
      candidatos[i] = { ...candidatos[i], ...dados, atualizado_em: new Date().toISOString() };
      return { ...candidatos[i] };
    },
    async registrarPreco(e) {
      precos.push(e);
    },
    async listarCliques(f) {
      return cliques
        .filter((c) => c.criado_em >= f.desde && (!f.utmCampaign || c.utm_campaign === f.utmCampaign))
        .map(({ produto_slug, utm_content, criado_em }) => ({ produto_slug, utm_content, criado_em }));
    },
  };

  return { repo, produtos, logs, falhas, candidatos, precos, cliques };
}
