import { createClient } from "@/lib/supabase/server";
import { MetaCloudProvider } from "./meta-cloud.provider";
import { WhatsAppWebProvider } from "./whatsapp-web.provider";
import type { WhatsappProvider } from "./provider.types";
import type { WhatsappProviderTipo } from "@/types";

/**
 * Único lugar do sistema que decide "qual provedor está ativo agora".
 * Todo o resto (services de assistência, CRM, chat...) chama
 * `getActiveProvider()` e usa a interface `WhatsappProvider` — nunca
 * importa `MetaCloudProvider`/`WhatsAppWebProvider` diretamente.
 */
export async function getActiveProvider(): Promise<WhatsappProvider> {
  const supabase = await createClient();
  const { data } = await supabase.from("integracoes_whatsapp").select("provider").maybeSingle();

  const tipo: WhatsappProviderTipo = data?.provider ?? "meta_cloud";
  return tipo === "whatsapp_web" ? new WhatsAppWebProvider() : new MetaCloudProvider();
}

export async function getProviderTipoAtivo(): Promise<WhatsappProviderTipo> {
  const supabase = await createClient();
  const { data } = await supabase.from("integracoes_whatsapp").select("provider").maybeSingle();
  return data?.provider ?? "meta_cloud";
}
