import { createClient } from "@/lib/supabase/server";

const BUCKET = "produtos-fotos";

function urlPublica(caminho: string, supabaseUrl: string): string {
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${caminho}`;
}

/** Sobe uma foto e ADICIONA no array `fotos` do produto ou aparelho (nunca substitui as que já tinha). */
export async function uploadFotoProduto(input: {
  tabela: "produtos" | "aparelhos" | "catalogo_lacrados_modelos";
  itemId: string;
  bytes: Buffer;
  extensao: string;
}): Promise<string[]> {
  const supabase = await createClient();
  const caminho = `${input.tabela}/${input.itemId}/${Date.now()}.${input.extensao}`;

  const { error: erroUpload } = await supabase.storage.from(BUCKET).upload(caminho, input.bytes, {
    contentType: `image/${input.extensao === "jpg" ? "jpeg" : input.extensao}`,
    upsert: false,
  });
  if (erroUpload) throw new Error(`Não foi possível subir a foto: ${erroUpload.message}`);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const url = urlPublica(caminho, supabaseUrl);

  const { data: atual } = await supabase.from(input.tabela).select("fotos").eq("id", input.itemId).maybeSingle();
  const fotosAtuais: string[] = atual?.fotos ?? [];
  const novasFotos = [...fotosAtuais, url];

  const { error: erroUpdate } = await supabase.from(input.tabela).update({ fotos: novasFotos }).eq("id", input.itemId);
  if (erroUpdate) throw new Error(`Foto subiu, mas não consegui vincular ao registro: ${erroUpdate.message}`);

  return novasFotos;
}

/** Remove uma foto específica do array — não apaga o arquivo do Storage (mantém histórico), só desvincula. */
export async function removerFotoProduto(input: { tabela: "produtos" | "aparelhos" | "catalogo_lacrados_modelos"; itemId: string; url: string }): Promise<string[]> {
  const supabase = await createClient();
  const { data: atual } = await supabase.from(input.tabela).select("fotos").eq("id", input.itemId).maybeSingle();
  const fotosAtuais: string[] = atual?.fotos ?? [];
  const novasFotos = fotosAtuais.filter((f) => f !== input.url);

  const { error } = await supabase.from(input.tabela).update({ fotos: novasFotos }).eq("id", input.itemId);
  if (error) throw new Error(`Não foi possível remover a foto: ${error.message}`);

  return novasFotos;
}

/** Reordena — a primeira da lista é sempre a foto de capa mostrada na loja. */
export async function reordenarFotosProduto(input: { tabela: "produtos" | "aparelhos" | "catalogo_lacrados_modelos"; itemId: string; fotosOrdenadas: string[] }): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from(input.tabela).update({ fotos: input.fotosOrdenadas }).eq("id", input.itemId);
  if (error) throw new Error(`Não foi possível reordenar: ${error.message}`);
}
