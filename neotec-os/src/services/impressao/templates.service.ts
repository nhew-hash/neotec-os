import { createClient } from "@/lib/supabase/server";
import type { TipoDocumentoImpressao, FormatoImpressao, DocumentoTemplate } from "@/types";

export async function buscarTemplateAtivo(
  tipoDocumento: TipoDocumentoImpressao,
  formato: FormatoImpressao
): Promise<DocumentoTemplate | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("documento_templates")
    .select("*")
    .eq("tipo_documento", tipoDocumento)
    .eq("formato", formato)
    .eq("ativo", true)
    .order("padrao", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

export async function listarTemplates(): Promise<DocumentoTemplate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("documento_templates").select("*").order("tipo_documento");
  if (error) throw new Error(`Não foi possível carregar os templates: ${error.message}`);
  return data ?? [];
}

export async function atualizarTemplate(id: string, conteudoHtml: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("documento_templates").update({ conteudo_html: conteudoHtml }).eq("id", id);
  if (error) throw new Error(`Não foi possível salvar o template: ${error.message}`);
}
