import { createClient } from "@/lib/supabase/server";
import type { IdentificacaoPasta } from "./banco-imagens-ia.service";

const BUCKET = "produtos-fotos";

function normalizar(valor: string | null): string | null {
  if (!valor) return null;
  return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export interface GrupoImagem {
  id: string;
  marca: string;
  modelo: string;
  cor: string | null;
  armazenamento: string | null;
  totalFotos: number;
}

/** Busca um grupo já existente que bate com essa identificação — usado pra perguntar "encontrado X > Y > Z, substituir?" antes de fazer qualquer coisa. */
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
 * marca+modelo+cor. Se `substituir` for true e o grupo já tinha fotos,
 * apaga as antigas antes (do banco, não do Storage — mantém histórico
 * de arquivo, só desvincula).
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
      .insert({ marca, modelo, cor, armazenamento })
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

    await supabase.from("banco_imagens_fotos").insert({ grupo_id: grupoId, url, ordem: i });
  }

  // Vinculação automática — todo produto/aparelho/lacrado com
  // marca+modelo+cor batendo EXATO passa a referenciar esse grupo.
  // Correspondência tem que ser exata, nunca "contém" — "iPhone 14" e
  // "iPhone 14 Pro Max" são modelos DIFERENTES que só compartilham um
  // prefixo em comum; usar "includes" aqui vinculava a foto errada em
  // modelo nenhuma relação real (bug real, corrigido).
  let produtosVinculados = 0;

  const { data: produtosCandidatos } = await supabase.from("produtos").select("id, marca, modelo, nome");
  for (const p of produtosCandidatos ?? []) {
    const nomeBate = normalizar(p.nome) === normalizar(modelo);
    const marcaBate = normalizar(p.marca) === normalizar(marca) || !p.marca;
    if (nomeBate && marcaBate) {
      await supabase.from("produtos").update({ banco_imagens_grupo_id: grupoId }).eq("id", p.id);
      produtosVinculados++;
    }
  }

  if (cor) {
    const { data: aparelhosCandidatos } = await supabase
      .from("aparelhos").select("id, cor, produto:produtos!inner(nome, marca)");
    for (const a of aparelhosCandidatos ?? []) {
      const produtoInfo = a.produto as unknown as { nome: string; marca: string | null };
      const nomeBate = normalizar(produtoInfo.nome) === normalizar(modelo);
      const corBate = normalizar(a.cor) === normalizar(cor);
      if (nomeBate && corBate) {
        await supabase.from("aparelhos").update({ banco_imagens_grupo_id: grupoId }).eq("id", a.id);
        produtosVinculados++;
      }
    }
  }

  const { data: modelosLacrado } = await supabase.from("catalogo_lacrados_modelos").select("id, nome");
  for (const m of modelosLacrado ?? []) {
    if (normalizar(m.nome) !== normalizar(modelo)) continue;

    // Vincula na(s) VARIANTE(S) de cor que batem exatamente — nunca no
    // modelo inteiro. Sem cor identificada na pasta, não vincula nada
    // (evita vínculo ambíguo tipo "essa foto é de qual cor mesmo?").
    if (!cor) continue;

    const { data: variantesDoModelo } = await supabase.from("catalogo_lacrados_variantes").select("id, cor").eq("modelo_id", m.id);
    for (const v of variantesDoModelo ?? []) {
      if (normalizar(v.cor) === normalizar(cor)) {
        await supabase.from("catalogo_lacrados_variantes").update({ banco_imagens_grupo_id: grupoId }).eq("id", v.id);
        produtosVinculados++;
      }
    }
  }

  return { grupoId, produtosVinculados };
}
