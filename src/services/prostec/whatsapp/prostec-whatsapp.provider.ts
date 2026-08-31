import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Envio de WhatsApp da Prostec — MESMA arquitetura da loja (Bridge
 * externo rodando Baileys, QR Code) — nunca Meta Cloud API (essa foi
 * a versão errada da Fase 201, corrigida na Fase 202). Precisa de um
 * SEGUNDO processo de Bridge rodando (endereço diferente do Bridge da
 * loja) — o mesmo software, uma segunda instância, autenticada com
 * seu próprio segredo, conectado a um número de WhatsApp diferente.
 *
 * Variáveis de ambiente próprias (nunca as mesmas da loja):
 *   WHATSAPP_PROSTEC_BRIDGE_URL
 *   WHATSAPP_PROSTEC_BRIDGE_SECRET
 */

function bridgeUrl(): string {
  const url = process.env.WHATSAPP_PROSTEC_BRIDGE_URL;
  if (!url) throw new Error("WHATSAPP_PROSTEC_BRIDGE_URL não configurada");
  const comProtocolo = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  return comProtocolo.replace(/\/$/, "");
}

function headers(): HeadersInit {
  return { "Content-Type": "application/json", "x-bridge-secret": process.env.WHATSAPP_PROSTEC_BRIDGE_SECRET ?? "" };
}

export async function enviarMensagemProstec(telefone: string, texto: string): Promise<{ enviado: boolean; motivo?: string }> {
  try {
    const response = await fetch(`${bridgeUrl()}/enviar`, {
      method: "POST", headers: headers(), body: JSON.stringify({ telefone, texto }), signal: AbortSignal.timeout(15_000),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { enviado: false, motivo: data?.erro ?? "Bridge da Prostec recusou o envio" };

    const admin = createAdminClient();
    const { data: linha } = await admin.from("integracoes_whatsapp_prostec").select("id").maybeSingle();
    if (linha) await admin.from("integracoes_whatsapp_prostec").update({ status: "conectado", ultima_conexao: new Date().toISOString() }).eq("id", linha.id);
    return { enviado: true };
  } catch (err) {
    return { enviado: false, motivo: err instanceof Error ? `Bridge da Prostec inacessível: ${err.message}` : "Bridge da Prostec inacessível" };
  }
}

/** Pede pro Bridge da Prostec iniciar a conexão (gera QR Code novo). */
export async function conectarWhatsappProstec(): Promise<{ ok: boolean; erro?: string }> {
  try {
    const response = await fetch(`${bridgeUrl()}/conectar`, { method: "POST", headers: headers() });
    if (!response.ok) return { ok: false, erro: `Bridge respondeu ${response.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : "Bridge da Prostec inacessível" };
  }
}

export async function desconectarWhatsappProstec(): Promise<{ ok: boolean; erro?: string }> {
  try {
    const response = await fetch(`${bridgeUrl()}/desconectar`, { method: "POST", headers: headers() });
    if (!response.ok) return { ok: false, erro: `Bridge respondeu ${response.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : "Bridge da Prostec inacessível" };
  }
}
