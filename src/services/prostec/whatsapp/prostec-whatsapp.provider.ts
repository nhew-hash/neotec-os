import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Envio de WhatsApp específico da Prostec — número PRÓPRIO, nunca o
 * mesmo da loja. Implementação direta contra a Meta Cloud API (sem
 * passar pelo resolver multi-provider da loja, que é hardcoded pra
 * ler de `integracoes_whatsapp` — tabela diferente, propósito
 * diferente).
 */
export async function enviarMensagemProstec(telefone: string, texto: string): Promise<{ enviado: boolean; motivo?: string }> {
  const admin = createAdminClient();
  const { data: config } = await admin.from("integracoes_whatsapp_prostec").select("phone_number_id, access_token").maybeSingle();

  if (!config?.phone_number_id || !config?.access_token) {
    return { enviado: false, motivo: "WhatsApp da Prostec não configurado ainda — vai em Configurações → WhatsApp Prostec." };
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${config.phone_number_id}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: telefone, type: "text", text: { body: texto } }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const erro = await res.json().catch(() => ({}));
      return { enviado: false, motivo: erro?.error?.message ?? `Erro HTTP ${res.status}` };
    }

    await admin.from("integracoes_whatsapp_prostec").update({ status: "conectado", ultima_conexao: new Date().toISOString() }).eq("phone_number_id", config.phone_number_id);
    return { enviado: true };
  } catch (err) {
    return { enviado: false, motivo: err instanceof Error ? err.message : "Erro desconhecido ao enviar" };
  }
}
