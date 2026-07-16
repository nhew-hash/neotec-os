import { createClient } from "@/lib/supabase/server";
import type { WhatsappProvider } from "./provider.types";
import type { ResultadoEnvioWhatsapp } from "../whatsapp.types";

/**
 * Este provider NÃO mantém conexão nenhuma — a Vercel é serverless, não
 * sustenta um WebSocket permanente do Baileys. Ele é só um cliente HTTP
 * que fala com o serviço Bridge (rodando à parte, sempre ligado, no
 * Railway ou onde você hospedar). O Bridge é quem de fato roda o Baileys.
 *
 * Autenticação: header `x-bridge-secret`, mesmo valor em
 * WHATSAPP_WEB_BRIDGE_SECRET dos dois lados (Neotec OS e Bridge).
 */
export class WhatsAppWebProvider implements WhatsappProvider {
  readonly nome = "WhatsApp Web (QR Code)";

  private get bridgeUrl(): string {
    const url = process.env.WHATSAPP_WEB_BRIDGE_URL;
    if (!url) throw new Error("WHATSAPP_WEB_BRIDGE_URL não configurada");
    // Tolera a variável configurada sem o protocolo (erro comum de
    // configuração) — sem isso, o fetch quebra com "Failed to parse URL".
    const comProtocolo = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    return comProtocolo.replace(/\/$/, "");
  }

  private get headers(): HeadersInit {
    return {
      "Content-Type": "application/json",
      "x-bridge-secret": process.env.WHATSAPP_WEB_BRIDGE_SECRET ?? "",
    };
  }

  async enviarTexto(telefone: string, texto: string, jidDireto?: string): Promise<ResultadoEnvioWhatsapp> {
    try {
      const response = await fetch(`${this.bridgeUrl}/enviar`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({ telefone, texto, jid: jidDireto }),
        signal: AbortSignal.timeout(15_000),
      });

      const data = await response.json();
      if (!response.ok) {
        return { enviado: false, motivo: data?.erro ?? "Bridge recusou o envio" };
      }
      return { enviado: true, whatsappMessageId: data?.idMensagem };
    } catch (err) {
      return {
        enviado: false,
        motivo: err instanceof Error ? `Bridge inacessível: ${err.message}` : "Bridge inacessível",
      };
    }
  }

  async enviarTemplate(
    telefone: string,
    _nomeTemplate: string,
    _idioma: string,
    variaveis: string[]
  ): Promise<ResultadoEnvioWhatsapp> {
    // WhatsApp Web não tem o conceito de template aprovado (isso é
    // regra da Cloud API oficial, por causa da janela de 24h) — manda
    // como texto simples, com as variáveis já substituídas antes de chegar aqui.
    return this.enviarTexto(telefone, variaveis.join(" "));
  }

  async obterStatus() {
    const supabase = await createClient();
    const { data } = await supabase
      .from("integracoes_whatsapp")
      .select("status, numero, ultima_conexao, mensagens_hoje")
      .eq("provider", "whatsapp_web")
      .maybeSingle();

    return {
      status: data?.status ?? ("desconectado" as const),
      numero: data?.numero ?? null,
      ultima_conexao: data?.ultima_conexao ?? null,
      mensagens_hoje: data?.mensagens_hoje ?? 0,
    };
  }

  /** Pede pro Bridge iniciar a conexão (gera QR Code novo). */
  async conectar(): Promise<{ ok: boolean; erro?: string }> {
    try {
      const response = await fetch(`${this.bridgeUrl}/conectar`, { method: "POST", headers: this.headers });
      if (!response.ok) return { ok: false, erro: `Bridge respondeu ${response.status}` };
      return { ok: true };
    } catch (err) {
      return { ok: false, erro: err instanceof Error ? err.message : "Bridge inacessível" };
    }
  }

  /** Pede pro Bridge desconectar e limpar a sessão (logout de verdade, não só desligar). */
  async desconectar(): Promise<{ ok: boolean; erro?: string }> {
    try {
      const response = await fetch(`${this.bridgeUrl}/desconectar`, { method: "POST", headers: this.headers });
      if (!response.ok) return { ok: false, erro: `Bridge respondeu ${response.status}` };
      return { ok: true };
    } catch (err) {
      return { ok: false, erro: err instanceof Error ? err.message : "Bridge inacessível" };
    }
  }
}
