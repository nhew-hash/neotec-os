import { createAdminClient } from "@/lib/supabase/admin";

/** Envio de WhatsApp exclusivo de cobrança — número PRÓPRIO, nunca o comercial nem o da Prostec. Mesmo padrão dos outros dois já existentes. */
export async function enviarMensagemCobranca(telefone: string, texto: string): Promise<{ enviado: boolean; motivo?: string }> {
  const admin = createAdminClient();
  const { data: config } = await admin.from("integracoes_whatsapp_cobranca").select("phone_number_id, access_token").maybeSingle();

  if (!config?.phone_number_id || !config?.access_token) {
    return { enviado: false, motivo: "WhatsApp de Cobrança não configurado — vai em Crediário → Configurações → WhatsApp de Cobrança." };
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
    await admin.from("integracoes_whatsapp_cobranca").update({ status: "conectado", ultima_conexao: new Date().toISOString() }).eq("phone_number_id", config.phone_number_id);
    return { enviado: true };
  } catch (err) {
    return { enviado: false, motivo: err instanceof Error ? err.message : "Erro desconhecido" };
  }
}
