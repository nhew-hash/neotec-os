import { createClient } from "@/lib/supabase/server";
import type { WhatsappTemplate, StatusAprovacaoTemplate } from "@/types";

/**
 * Templates espelham o conceito de "message templates" da Meta Cloud API:
 * fora da janela de 24h de atendimento, só é possível iniciar conversa
 * com um template pré-aprovado. `status_aprovacao` acompanha o mesmo
 * ciclo de vida do template no Business Manager da Meta (rascunho →
 * em análise → aprovado/rejeitado) — quando a integração real existir,
 * um worker sincroniza esse campo; até lá, é atualizado manualmente.
 */

export async function listarTemplates(): Promise<WhatsappTemplate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("whatsapp_templates").select("*").order("nome");
  if (error) throw new Error(`Não foi possível carregar os templates: ${error.message}`);
  return (data ?? []) as unknown as WhatsappTemplate[];
}

export async function criarTemplate(input: {
  nome: string;
  categoria: string;
  idioma?: string;
  corpo: string;
  variaveis?: string[];
}): Promise<WhatsappTemplate> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("whatsapp_templates")
    .insert({
      nome: input.nome,
      categoria: input.categoria,
      idioma: input.idioma ?? "pt_BR",
      corpo: input.corpo,
      variaveis: input.variaveis ?? [],
    })
    .select("*")
    .single();

  if (error) throw new Error(`Não foi possível criar o template: ${error.message}`);
  return data as unknown as WhatsappTemplate;
}

export async function atualizarStatusAprovacaoTemplate(
  id: string,
  status: StatusAprovacaoTemplate,
  metaTemplateId?: string
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("whatsapp_templates")
    .update({ status_aprovacao: status, meta_template_id: metaTemplateId ?? null })
    .eq("id", id);
  if (error) throw new Error(`Não foi possível atualizar o template: ${error.message}`);
}

/** Substitui {{1}}, {{2}}... pelas variáveis, na ordem — mesma convenção da Meta. */
export function preencherTemplate(corpo: string, variaveis: string[]): string {
  return variaveis.reduce((texto, valor, i) => texto.replaceAll(`{{${i + 1}}}`, valor), corpo);
}
