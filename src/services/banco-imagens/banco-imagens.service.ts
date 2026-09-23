import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { IdentificacaoPasta } from "./banco-imagens-ia.service";
import {
  normalizar,
  resolverGrupo,
  equivalentesPadraoParaCor,
  type GrupoParaCorrespondencia,
} from "./correspondencia";

const BUCKET = "produtos-fotos";

export interface GrupoImagem {
  id: string;
  marca: string;
  modelo: string;
  cor: string | null;
  armazenamento: string | null;
  totalFotos: number;
}

/** Busca um grupo já existente que bate com essa identificação — usado pra perguntar "encontrado X > Y > Z, substituir?" antes de fazer qualquer coisa. Cor não é mais colapsada (Fase 247): "Estelar" só bate com um grupo "Estelar", nunca com um grupo "Branco". */
export async function buscarGrupoExistente(identificacao: IdentificacaoPasta): Promise<GrupoImagem | null> {
  const supabase = await createClient();
  const { data: grupos } = await supabase.from("banco_imagens_grupos").select("*");

  const encontrado = (grupos ?? []).find(
    (g) =>
      normalizar(g.marca) === normalizar(identificacao.marca) &&
      normalizar(g.modelo) === normalizar(identificacao.modelo) &&
      normalizar(g.cor) === normalizar(identificacao.cor) &&
      normalizar(g.armazenamento) === normalizar(identificacao.armazenamento)
  );

  if (!encontrado) return null;

  const { count } = await supabase.from("banco_imagens_fotos").select("id", { count: "exact", head: true }).eq("grupo_id", encontrado.id);

  return {
    id: encontrado.id, marca: encontrado.marca, modelo: encontrado.modelo,
    cor: encontrado.cor, armazenamento: encontrado.armazenamento, totalFotos: count ?? 0,
  };
}

/** Acha um grupo já existente pelo match em memória — mais confiável que montar uma query com cor/armazenamento possivelmente nulos. */
async function encontrarOuNulo(marca: string, modelo: string, cor: string | null, armazenamento: string | null): Promise<string | null> {
  const supabase = await createClient();
  const { data: candidatos } = await supabase.from("banco_imagens_grupos").select("id, marca, modelo, cor, armazenamento");
  const match = (candidatos ?? []).find(
    (g) =>
      normalizar(g.marca) === normalizar(marca) &&
      normalizar(g.modelo) === normalizar(modelo) &&
      normalizar(g.cor) === normalizar(cor) &&
      normalizar(g.armazenamento) === normalizar(armazenamento)
  );
  return match?.id ?? null;
}

/**
 * Importa uma pasta inteira — cria o grupo se não existir, sobe todas
 * as fotos na ordem em que vieram (1.jpg = capa), e VINCULA
 * automaticamente todo produto/aparelho/modelo-lacrado que bater com
 * marca+modelo+cor (via `correspondencia.ts`). Se `substituir` for
 * true e o grupo já tinha fotos, apaga as antigas antes (do banco, não
 * do Storage — mantém histórico de arquivo, só desvincula).
 *
 * Fase 247: a cor recebida aqui já é a OFICIAL (a IA não colapsa mais).
 * Ao criar um grupo NOVO, semeia `cores_equivalentes` com a tradução
 * simplificada padrão (ex: grupo "Estelar" ganha equivalente "Branco"),
 * pra continuar casando com estoque cadastrado com o nome antigo.
 */
export async function importarPastaImagens(input: {
  identificacao: IdentificacaoPasta;
  arquivos: { bytes: Buffer; extensao: string; nomeOriginal: string }[];
  substituir: boolean;
}): Promise<{ grupoId: string; produtosVinculados: number }> {
  const supabase = await createClient();
  const { marca, modelo, cor, armazenamento } = input.identificacao;

  const grupoExistenteId = await encontrarOuNulo(marca, modelo, cor, armazenamento);

  let grupoId: string;
  if (grupoExistenteId) {
    grupoId = grupoExistenteId;
    if (input.substituir) {
      await supabase.from("banco_imagens_fotos").delete().eq("grupo_id", grupoId);
    }
  } else {
    const { data: novoGrupo, error } = await supabase
      .from("banco_imagens_grupos")
      .insert({ marca, modelo, cor, armazenamento, cores_equivalentes: equivalentesPadraoParaCor(cor) })
      .select("id").single();
    if (error) throw new Error(`Não foi possível criar o grupo: ${error.message}`);
    grupoId = novoGrupo.id;
  }

  // Sobe os arquivos na ordem em que vieram — o primeiro é sempre a capa.
  for (let i = 0; i < input.arquivos.length; i++) {
    const arquivo = input.arquivos[i];
    const caminho = `banco-imagens/${grupoId}/${Date.now()}-${i}.${arquivo.extensao}`;
    const { error: erroUpload } = await supabase.storage.from(BUCKET).upload(caminho, arquivo.bytes, {
      contentType: `image/${arquivo.extensao === "jpg" ? "jpeg" : arquivo.extensao}`,
    });
    if (erroUpload) throw new Error(`Falha ao subir "${arquivo.nomeOriginal}": ${erroUpload.message}`);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const url = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${caminho}`;

    await supabase.from("banco_imagens_fotos").insert({ grupo_id: grupoId, url, ordem: i, caminho_storage: caminho });
  }

  // Vinculação automática — só para este grupo recém-importado (a
  // revinculação completa/em lote é feita por `revincularTudo`).
  const relatorio = await vincularGrupos(supabase, [grupoId], { forcar: false });
  return { grupoId, produtosVinculados: relatorio.vinculados };
}

// ---------------------------------------------------------------------------
// Fase 247 — vinculação em uma passada (carrega tudo uma vez, casa em
// memória com correspondencia.ts, aplica em lote). Substitui o antigo
// esquema de `revincularTudo` que fazia uma consulta nova pra cada
// tabela DENTRO do loop de cada grupo (N grupos × M consultas).
// ---------------------------------------------------------------------------

export interface ItemPendente {
  tipo: "produto" | "aparelho" | "lacrado";
  id: string;
  nome: string;
  cor: string | null;
}

export interface ItemAmbiguo extends ItemPendente {
  candidatos: string[];
}

export interface RelatorioVinculacao {
  vinculados: number;
  jaVinculados: number;
  ambiguos: ItemAmbiguo[];
  semGrupo: ItemPendente[];
  /** Detalhe de cada item efetivamente (ou, em dry-run, hipoteticamente) vinculado — usado pela importação em lote pra montar "vínculos por grupo" na resposta. */
  vinculadosDetalhe: (ItemPendente & { grupoId: string })[];
}

interface CandidatoProduto {
  id: string;
  nome: string;
  marca: string | null;
  banco_imagens_grupo_id: string | null;
}

interface CandidatoAparelho {
  id: string;
  cor: string | null;
  banco_imagens_grupo_id: string | null;
  produto: { nome: string; marca: string | null } | null;
}

interface CandidatoVariante {
  id: string;
  cor: string | null;
  banco_imagens_grupo_id: string | null;
  modelo: { nome: string; marca: string | null } | null;
}

async function carregarGrupos(supabase: SupabaseClient): Promise<GrupoParaCorrespondencia[]> {
  const { data } = await supabase
    .from("banco_imagens_grupos")
    .select("id, marca, modelo, cor, cores_equivalentes, modelos_equivalentes");
  return (data ?? []).map((g) => ({
    id: g.id,
    marca: g.marca,
    modelo: g.modelo,
    cor: g.cor,
    coresEquivalentes: g.cores_equivalentes ?? [],
    modelosEquivalentes: g.modelos_equivalentes ?? [],
  }));
}

/**
 * Vincula (ou revincula, com `forcar: true`) produtos, aparelhos e
 * variantes lacradas aos grupos do banco de imagens. Carrega cada
 * tabela candidata UMA vez (3 consultas no total, não uma por grupo),
 * casa tudo em memória via `resolverGrupo` e só grava as linhas que
 * de fato mudam.
 *
 * `apenasGrupoIds`: quando informado, só considera o vínculo de itens
 * contra ESSES grupos (usado pela importação em lote, que só quer
 * revincular os grupos que acabou de tocar — não o banco inteiro).
 * Itens já vinculados a outro grupo continuam intactos nesse modo,
 * mesmo que um dos grupos informados desse match "melhor".
 */
export async function vincularGrupos(
  supabase: SupabaseClient,
  apenasGrupoIds: string[] | null,
  opts: { forcar: boolean; dryRun?: boolean }
): Promise<RelatorioVinculacao> {
  const todosOsGrupos = await carregarGrupos(supabase);
  const grupoIdsAlvo = apenasGrupoIds ? new Set(apenasGrupoIds) : null;

  const relatorio: RelatorioVinculacao = { vinculados: 0, jaVinculados: 0, ambiguos: [], semGrupo: [], vinculadosDetalhe: [] };

  // --- Produtos (genéricos + seminovo pai) ---
  const { data: produtosRaw } = await supabase.from("produtos").select("id, nome, marca, banco_imagens_grupo_id");
  const produtos = (produtosRaw ?? []) as CandidatoProduto[];
  for (const p of produtos) {
    const jaVinculado = !!p.banco_imagens_grupo_id;
    if (jaVinculado && !opts.forcar) {
      relatorio.jaVinculados++;
      continue;
    }
    const resultado = resolverGrupo({ marca: p.marca, modelo: p.nome, cor: null }, todosOsGrupos);
    if (resultado.status === "vinculado") {
      if (grupoIdsAlvo && !grupoIdsAlvo.has(resultado.grupoId)) continue;
      if (jaVinculado && resultado.grupoId === p.banco_imagens_grupo_id) { relatorio.jaVinculados++; continue; }
      if (!opts.dryRun) await supabase.from("produtos").update({ banco_imagens_grupo_id: resultado.grupoId }).eq("id", p.id);
      relatorio.vinculados++;
      relatorio.vinculadosDetalhe.push({ tipo: "produto", id: p.id, nome: p.nome, cor: null, grupoId: resultado.grupoId });
    } else if (resultado.status === "ambiguo") {
      relatorio.ambiguos.push({ tipo: "produto", id: p.id, nome: p.nome, cor: null, candidatos: resultado.candidatos });
    } else if (!jaVinculado) {
      relatorio.semGrupo.push({ tipo: "produto", id: p.id, nome: p.nome, cor: null });
    }
  }

  // --- Aparelhos (seminovo, por cor específica) ---
  const { data: aparelhosRaw } = await supabase
    .from("aparelhos")
    .select("id, cor, banco_imagens_grupo_id, produto:produtos!inner(nome, marca)");
  const aparelhos = (aparelhosRaw ?? []) as unknown as CandidatoAparelho[];
  for (const a of aparelhos) {
    if (!a.produto) continue;
    const jaVinculado = !!a.banco_imagens_grupo_id;
    if (jaVinculado && !opts.forcar) {
      relatorio.jaVinculados++;
      continue;
    }
    const resultado = resolverGrupo({ marca: a.produto.marca, modelo: a.produto.nome, cor: a.cor }, todosOsGrupos);
    if (resultado.status === "vinculado") {
      if (grupoIdsAlvo && !grupoIdsAlvo.has(resultado.grupoId)) continue;
      if (jaVinculado && resultado.grupoId === a.banco_imagens_grupo_id) { relatorio.jaVinculados++; continue; }
      if (!opts.dryRun) await supabase.from("aparelhos").update({ banco_imagens_grupo_id: resultado.grupoId }).eq("id", a.id);
      relatorio.vinculados++;
      relatorio.vinculadosDetalhe.push({ tipo: "aparelho", id: a.id, nome: a.produto.nome, cor: a.cor, grupoId: resultado.grupoId });
    } else if (resultado.status === "ambiguo") {
      relatorio.ambiguos.push({ tipo: "aparelho", id: a.id, nome: a.produto.nome, cor: a.cor, candidatos: resultado.candidatos });
    } else if (!jaVinculado) {
      relatorio.semGrupo.push({ tipo: "aparelho", id: a.id, nome: a.produto.nome, cor: a.cor });
    }
  }

  // --- Variantes de lacrado (por modelo + cor) ---
  const { data: variantesRaw } = await supabase
    .from("catalogo_lacrados_variantes")
    .select("id, cor, banco_imagens_grupo_id, modelo:catalogo_lacrados_modelos!inner(nome, marca)");
  const variantes = (variantesRaw ?? []) as unknown as CandidatoVariante[];
  for (const v of variantes) {
    if (!v.modelo) continue;
    const jaVinculado = !!v.banco_imagens_grupo_id;
    if (jaVinculado && !opts.forcar) {
      relatorio.jaVinculados++;
      continue;
    }
    const resultado = resolverGrupo({ marca: v.modelo.marca, modelo: v.modelo.nome, cor: v.cor }, todosOsGrupos);
    if (resultado.status === "vinculado") {
      if (grupoIdsAlvo && !grupoIdsAlvo.has(resultado.grupoId)) continue;
      if (jaVinculado && resultado.grupoId === v.banco_imagens_grupo_id) { relatorio.jaVinculados++; continue; }
      if (!opts.dryRun) await supabase.from("catalogo_lacrados_variantes").update({ banco_imagens_grupo_id: resultado.grupoId }).eq("id", v.id);
      relatorio.vinculados++;
      relatorio.vinculadosDetalhe.push({ tipo: "lacrado", id: v.id, nome: v.modelo.nome, cor: v.cor, grupoId: resultado.grupoId });
    } else if (resultado.status === "ambiguo") {
      relatorio.ambiguos.push({ tipo: "lacrado", id: v.id, nome: v.modelo.nome, cor: v.cor, candidatos: resultado.candidatos });
    } else if (!jaVinculado) {
      relatorio.semGrupo.push({ tipo: "lacrado", id: v.id, nome: v.modelo.nome, cor: v.cor });
    }
  }

  return relatorio;
}

/**
 * Revincula TUDO — roda a vinculação de novo contra o estado ATUAL do
 * catálogo inteiro. Resolve casos onde a variante certa não existia (ou
 * tinha outro armazenamento) no momento da importação da foto, e por
 * isso nunca vinculou. Nunca cria grupo novo nem apaga foto — só
 * atualiza vínculo. Com `forcar: true`, reavalia até item já vinculado
 * (útil depois de editar `cores_equivalentes`/`modelos_equivalentes`
 * de um grupo, quando um vínculo antigo pode ter ficado errado).
 */
export async function revincularTudo(opts: { forcar?: boolean; dryRun?: boolean } = {}): Promise<RelatorioVinculacao> {
  const supabase = await createClient();
  return vincularGrupos(supabase, null, { forcar: opts.forcar ?? false, dryRun: opts.dryRun ?? false });
}

// ---------------------------------------------------------------------------
// Fase 247 — tela de gestão (`/estoque/banco-imagens`): listar grupos com
// filtros, ver/editar detalhe de um grupo, vincular manualmente um item
// pendente ou ambíguo.
// ---------------------------------------------------------------------------

export interface GrupoListado {
  id: string;
  marca: string;
  modelo: string;
  cor: string | null;
  categoria: string | null;
  classificacao: string;
  observacao: string | null;
  capaUrl: string | null;
  totalFotos: number;
  totalVinculos: number;
}

export interface FiltrosGrupos {
  categoria?: string;
  marca?: string;
  modelo?: string;
  cor?: string;
  classificacao?: string;
  comFoto?: "com" | "sem";
}

export async function listarGrupos(filtros: FiltrosGrupos = {}): Promise<GrupoListado[]> {
  const supabase = await createClient();
  let query = supabase.from("banco_imagens_grupos").select("id, marca, modelo, cor, categoria, classificacao, observacao");
  if (filtros.categoria) query = query.eq("categoria", filtros.categoria);
  if (filtros.marca) query = query.ilike("marca", `%${filtros.marca}%`);
  if (filtros.modelo) query = query.ilike("modelo", `%${filtros.modelo}%`);
  if (filtros.cor) query = query.ilike("cor", `%${filtros.cor}%`);
  if (filtros.classificacao) query = query.eq("classificacao", filtros.classificacao);

  const { data: grupos } = await query.order("marca").order("modelo");
  if (!grupos || grupos.length === 0) return [];

  const grupoIds = grupos.map((g) => g.id);
  const [{ data: fotos }, { data: produtos }, { data: aparelhos }, { data: variantes }] = await Promise.all([
    supabase.from("banco_imagens_fotos").select("grupo_id, url, ordem").in("grupo_id", grupoIds),
    supabase.from("produtos").select("id, banco_imagens_grupo_id").in("banco_imagens_grupo_id", grupoIds),
    supabase.from("aparelhos").select("id, banco_imagens_grupo_id").in("banco_imagens_grupo_id", grupoIds),
    supabase.from("catalogo_lacrados_variantes").select("id, banco_imagens_grupo_id").in("banco_imagens_grupo_id", grupoIds),
  ]);

  const resultado: GrupoListado[] = grupos.map((g) => {
    const fotosDoGrupo = (fotos ?? []).filter((f) => f.grupo_id === g.id);
    const capa = [...fotosDoGrupo].sort((a, b) => a.ordem - b.ordem)[0];
    const totalVinculos =
      (produtos ?? []).filter((p) => p.banco_imagens_grupo_id === g.id).length +
      (aparelhos ?? []).filter((a) => a.banco_imagens_grupo_id === g.id).length +
      (variantes ?? []).filter((v) => v.banco_imagens_grupo_id === g.id).length;
    return {
      id: g.id, marca: g.marca, modelo: g.modelo, cor: g.cor, categoria: g.categoria,
      classificacao: g.classificacao, observacao: g.observacao,
      capaUrl: capa?.url ?? null, totalFotos: fotosDoGrupo.length, totalVinculos,
    };
  });

  if (filtros.comFoto === "com") return resultado.filter((r) => r.totalFotos > 0);
  if (filtros.comFoto === "sem") return resultado.filter((r) => r.totalFotos === 0);
  return resultado;
}

export async function listarCategoriasDistintas(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("banco_imagens_grupos").select("categoria");
  const categorias = new Set((data ?? []).map((g) => g.categoria).filter((c): c is string => !!c));
  return [...categorias].sort();
}

export interface FotoDetalhe {
  id: string;
  url: string;
  ordem: number;
  tipo: string;
}

export interface VinculoDetalhe {
  tipo: "produto" | "aparelho" | "lacrado";
  id: string;
  nome: string;
}

export interface DetalheGrupo {
  id: string;
  marca: string;
  modelo: string;
  cor: string | null;
  armazenamento: string | null;
  categoria: string | null;
  classificacao: string;
  observacao: string | null;
  fonteUrl: string | null;
  coresEquivalentes: string[];
  modelosEquivalentes: string[];
  fotos: FotoDetalhe[];
  vinculos: VinculoDetalhe[];
}

export async function obterDetalheGrupo(grupoId: string): Promise<DetalheGrupo | null> {
  const supabase = await createClient();
  const { data: g } = await supabase.from("banco_imagens_grupos").select("*").eq("id", grupoId).maybeSingle();
  if (!g) return null;

  const [{ data: fotos }, { data: produtos }, { data: aparelhosRaw }, { data: variantesRaw }] = await Promise.all([
    supabase.from("banco_imagens_fotos").select("id, url, ordem, tipo").eq("grupo_id", grupoId).order("ordem"),
    supabase.from("produtos").select("id, nome").eq("banco_imagens_grupo_id", grupoId),
    supabase.from("aparelhos").select("id, cor, produto:produtos!inner(nome)").eq("banco_imagens_grupo_id", grupoId),
    supabase.from("catalogo_lacrados_variantes").select("id, cor, modelo:catalogo_lacrados_modelos!inner(nome)").eq("banco_imagens_grupo_id", grupoId),
  ]);

  const aparelhos = (aparelhosRaw ?? []) as unknown as { id: string; cor: string | null; produto: { nome: string } | null }[];
  const variantes = (variantesRaw ?? []) as unknown as { id: string; cor: string; modelo: { nome: string } | null }[];

  const vinculos: VinculoDetalhe[] = [
    ...(produtos ?? []).map((p) => ({ tipo: "produto" as const, id: p.id, nome: p.nome })),
    ...aparelhos.filter((a) => a.produto).map((a) => ({ tipo: "aparelho" as const, id: a.id, nome: `${a.produto!.nome} (${a.cor ?? "sem cor"})` })),
    ...variantes.filter((v) => v.modelo).map((v) => ({ tipo: "lacrado" as const, id: v.id, nome: `${v.modelo!.nome} (${v.cor})` })),
  ];

  return {
    id: g.id, marca: g.marca, modelo: g.modelo, cor: g.cor, armazenamento: g.armazenamento,
    categoria: g.categoria, classificacao: g.classificacao, observacao: g.observacao, fonteUrl: g.fonte_url,
    coresEquivalentes: g.cores_equivalentes ?? [], modelosEquivalentes: g.modelos_equivalentes ?? [],
    fotos: (fotos ?? []) as FotoDetalhe[],
    vinculos,
  };
}

export async function atualizarEquivalentesGrupo(grupoId: string, coresEquivalentes: string[], modelosEquivalentes: string[]): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("banco_imagens_grupos")
    .update({ cores_equivalentes: coresEquivalentes, modelos_equivalentes: modelosEquivalentes })
    .eq("id", grupoId);
  if (error) throw new Error(`Falha ao salvar equivalentes: ${error.message}`);
}

/** Reordena as fotos de um grupo — `ordemFotoIds` é a lista de ids na nova ordem desejada (posição 0 = nova capa). */
export async function reordenarFotosGrupo(grupoId: string, ordemFotoIds: string[]): Promise<void> {
  const supabase = await createClient();
  for (let i = 0; i < ordemFotoIds.length; i++) {
    const { error } = await supabase.from("banco_imagens_fotos").update({ ordem: i }).eq("id", ordemFotoIds[i]).eq("grupo_id", grupoId);
    if (error) throw new Error(`Falha ao reordenar fotos: ${error.message}`);
  }
}

/** Vincula manualmente um item pendente/ambíguo a um grupo escolhido pela equipe — usado na aba "Pendências". */
export async function vincularManualmente(tipo: "produto" | "aparelho" | "lacrado", id: string, grupoId: string): Promise<void> {
  const supabase = await createClient();
  const tabela = tipo === "produto" ? "produtos" : tipo === "aparelho" ? "aparelhos" : "catalogo_lacrados_variantes";
  const { error } = await supabase.from(tabela).update({ banco_imagens_grupo_id: grupoId }).eq("id", id);
  if (error) throw new Error(`Falha ao vincular manualmente: ${error.message}`);
}
