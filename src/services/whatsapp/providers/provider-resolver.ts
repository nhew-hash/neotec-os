import { createAdminClient } from "@/lib/supabase/admin";
import { MetaCloudProvider } from "./meta-cloud.provider";
import { WhatsAppWebProvider } from "./whatsapp-web.provider";
import type { WhatsappProvider } from "./provider.types";
import type { WhatsappProviderTipo } from "@/types";

/**
 * Único lugar do sistema que decide "qual provedor está ativo agora".
 * Todo o resto (services de assistência, CRM, chat...) chama
 * `getActiveProvider()` e usa a interface `WhatsappProvider` — nunca
 * importa `MetaCloudProvider`/`WhatsAppWebProvider` diretamente.
 *
 * Usa Service Role Key de propósito — mesmo bug e mesma correção da
 * Fase 37 (resolver de IA): essa função é chamada de dentro do
 * processamento de webhook (IA de Atendimento, follow-up automático),
 * sem NENHUMA sessão de usuário. Com o client de sessão, a RLS não
 * achava a configuração, caía no padrão "meta_cloud" mesmo com
 * WhatsApp Web selecionado — e como a Meta não estava configurada de
 * verdade, o envio falhava com "Authentication Error" toda vez que a
 * IA tentava responder (envio manual funcionava normal, porque esse
 * caminho tem sessão de usuário).
 */
export async function getActiveProvider(): Promise<WhatsappProvider> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("integracoes_whatsapp").select("provider").maybeSingle();

  const tipo: WhatsappProviderTipo = data?.provider ?? "meta_cloud";
  return tipo === "whatsapp_web" ? new WhatsAppWebProvider() : new MetaCloudProvider();
}

export async function getProviderTipoAtivo(): Promise<WhatsappProviderTipo> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("integracoes_whatsapp").select("provider").maybeSingle();
  return data?.provider ?? "meta_cloud";
}
