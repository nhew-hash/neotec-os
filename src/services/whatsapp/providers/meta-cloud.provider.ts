import { enviarTexto, enviarTemplate, integracaoAtiva } from "../whatsapp.api";
import { createClient } from "@/lib/supabase/server";
import type { WhatsappProvider } from "./provider.types";
import type { ResultadoEnvioWhatsapp } from "../whatsapp.types";

/**
 * Adapta o que já existia em whatsapp.api.ts (chamadas HTTP direto pra
 * Graph API da Meta) pro contrato único WhatsappProvider. Nenhuma lógica
 * de envio muda — só passou a ficar atrás da interface.
 */
export class MetaCloudProvider implements WhatsappProvider {
  readonly nome = "Meta Cloud API";

  async enviarTexto(telefone: string, texto: string, _jidDireto?: string): Promise<ResultadoEnvioWhatsapp> {
    return enviarTexto(telefone, texto);
  }

  async enviarTemplate(
    telefone: string,
    nomeTemplate: string,
    idioma: string,
    variaveis: string[]
  ): Promise<ResultadoEnvioWhatsapp> {
    return enviarTemplate(telefone, nomeTemplate, idioma, variaveis);
  }

  async obterStatus() {
    const supabase = await createClient();
    const { data } = await supabase
      .from("integracoes_whatsapp")
      .select("status, numero, ultima_conexao, mensagens_hoje")
      .eq("provider", "meta_cloud")
      .maybeSingle();

    return {
      status: integracaoAtiva() ? "conectado" as const : "desconectado" as const,
      numero: data?.numero ?? process.env.WHATSAPP_PHONE_NUMBER_ID ?? null,
      ultima_conexao: data?.ultima_conexao ?? null,
      mensagens_hoje: data?.mensagens_hoje ?? 0,
    };
  }
}
