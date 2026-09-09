import { createClient } from "@/lib/supabase/server";
import { WhatsAppWebProvider } from "@/services/whatsapp/providers/whatsapp-web.provider";
import type { IntegracaoWhatsapp, WhatsappProviderTipo } from "@/types";

export async function buscarIntegracaoWhatsapp(): Promise<IntegracaoWhatsapp | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("integracoes_whatsapp").select("*").maybeSingle();
  if (error) throw new Error(`Não foi possível carregar a integração: ${error.message}`);
  return data;
}

export async function salvarProviderAtivo(provider: WhatsappProviderTipo): Promise<void> {
  const supabase = await createClient();

  // RLS já restringe à loja do usuário, e há no máximo uma linha por
  // loja (unique constraint) — busca o id real antes de atualizar, em
  // vez de tentar um filtro "pega tudo" que quebra com uuid vazio.
  const { data: linha, error: erroBusca } = await supabase
    .from("integracoes_whatsapp")
    .select("id")
    .maybeSingle();

  if (erroBusca) throw new Error(`Não foi possível localizar a integração: ${erroBusca.message}`);
  if (!linha) throw new Error("Nenhuma configuração de WhatsApp encontrada para esta loja");

  const { error } = await supabase.from("integracoes_whatsapp").update({ provider }).eq("id", linha.id);
  if (error) throw new Error(`Não foi possível salvar o provedor: ${error.message}`);
}

export async function conectarWhatsappWeb(): Promise<{ ok: boolean; erro?: string }> {
  const provider = new WhatsAppWebProvider();
  return provider.conectar();
}

export async function desconectarWhatsappWeb(): Promise<{ ok: boolean; erro?: string }> {
  const provider = new WhatsAppWebProvider();
  const resultado = await provider.desconectar();

  if (resultado.ok) {
    const supabase = await createClient();
    await supabase
      .from("integracoes_whatsapp")
      .update({ status: "desconectado", numero: null, qr_code: null })
      .eq("provider", "whatsapp_web");
  }

  return resultado;
}
