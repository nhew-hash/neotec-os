import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Service Role Key sempre — esse upload roda tanto de dentro do
 * webhook (recebendo foto de cliente, sem sessão nenhuma) quanto de uma
 * Server Action disparada por staff (mandando áudio gravado). Mesma
 * lição das Fases 37-39: mais simples e mais robusto usar Service Role
 * pra infraestrutura que precisa funcionar nos dois contextos.
 */
export async function uploadMidiaWhatsapp(
  conversaId: string,
  bytes: Buffer,
  extensao: string
): Promise<string> {
  const supabase = createAdminClient();
  const caminho = `${conversaId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extensao}`;

  const { error } = await supabase.storage.from("whatsapp-media").upload(caminho, bytes, { upsert: false });
  if (error) throw new Error(`Não foi possível salvar a mídia: ${error.message}`);

  return caminho; // caminho dentro do bucket — nunca a URL final (ver rota /api/whatsapp-midia)
}

const EXTENSAO_POR_MIME: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
  "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/webm": "webm",
  "application/pdf": "pdf",
};

export function extensaoPorMimeType(mimeType: string): string {
  return EXTENSAO_POR_MIME[mimeType] ?? mimeType.split("/")[1] ?? "bin";
}
