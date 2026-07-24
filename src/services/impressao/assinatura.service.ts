import { createClient } from "@/lib/supabase/server";
import type { AssinaturaDigital, TipoDocumentoImpressao, TipoAssinanteDocumento } from "@/types";

const BUCKET = "assinaturas";

export async function assinaturaDigitalHabilitada(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("configuracoes_ia").select("assinatura_digital_habilitada").maybeSingle();
  return data?.assinatura_digital_habilitada ?? false;
}

export async function alternarAssinaturaDigital(habilitada: boolean): Promise<void> {
  const supabase = await createClient();
  const { data: linha } = await supabase.from("configuracoes_ia").select("id").maybeSingle();
  if (!linha) throw new Error("Nenhuma configuração encontrada para esta loja");
  const { error } = await supabase.from("configuracoes_ia").update({ assinatura_digital_habilitada: habilitada }).eq("id", linha.id);
  if (error) throw new Error(`Não foi possível salvar: ${error.message}`);
}

/** `imagemBase64` vem do canvas (toDataURL) — só a parte de dados, sem o prefixo "data:image/png;base64,". */
export async function salvarAssinatura(input: {
  tipoDocumento: TipoDocumentoImpressao;
  referenciaId: string;
  tipoAssinante: TipoAssinanteDocumento;
  imagemBase64: string;
  usuarioId: string;
}): Promise<void> {
  const supabase = await createClient();
  const bytes = Buffer.from(input.imagemBase64, "base64");
  const caminho = `${input.tipoDocumento}/${input.referenciaId}/${input.tipoAssinante}-${Date.now()}.png`;

  const { error: erroUpload } = await supabase.storage.from(BUCKET).upload(caminho, bytes, {
    contentType: "image/png",
    upsert: true, // permite recapturar (ex: cliente errou o traço, assina de novo)
  });
  if (erroUpload) throw new Error(`Não foi possível salvar a assinatura: ${erroUpload.message}`);

  const { error } = await supabase.from("assinaturas_digitais").insert({
    tipo_documento: input.tipoDocumento,
    referencia_id: input.referenciaId,
    tipo_assinante: input.tipoAssinante,
    caminho_storage: caminho,
    usuario_id: input.usuarioId,
  });
  if (error) throw new Error(`Não foi possível registrar a assinatura: ${error.message}`);
}

export async function buscarAssinaturas(tipoDocumento: TipoDocumentoImpressao, referenciaId: string): Promise<AssinaturaDigital[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assinaturas_digitais")
    .select("*")
    .eq("tipo_documento", tipoDocumento)
    .eq("referencia_id", referenciaId)
    .order("criado_em", { ascending: false });
  if (error) throw new Error(`Não foi possível carregar assinaturas: ${error.message}`);
  return data ?? [];
}

/** Gera a tag <img> pronta (URL assinada, 5 min) — ou string vazia se não tiver assinatura desse tipo. Usado direto no template de impressão. */
export async function montarHtmlAssinatura(
  tipoDocumento: TipoDocumentoImpressao,
  referenciaId: string,
  tipoAssinante: TipoAssinanteDocumento
): Promise<string> {
  const supabase = await createClient();
  const assinaturas = await buscarAssinaturas(tipoDocumento, referenciaId);
  const assinatura = assinaturas.find((a) => a.tipo_assinante === tipoAssinante);
  if (!assinatura) return "";

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(assinatura.caminho_storage, 300);
  if (error || !data) return "";

  return `<img src="${data.signedUrl}" alt="Assinatura" style="max-height:50px;" />`;
}
