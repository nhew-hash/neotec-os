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

// Anti-ban: nunca dispara duas mensagens da Prostec "de uma vez só" — um
// número novo mandando várias mensagens idênticas/rápidas em sequência é
// exatamente o padrão que o WhatsApp detecta como bot e bane. Antes de
// cada envio, espera um intervalo mínimo (com jitter aleatório) contado a
// partir do último envio, salvo em `integracoes_whatsapp_prostec.
// ultimo_envio_em` — funciona mesmo com vários cliques/leads em sequência
// (kanban, tabela, ou vários leads importados), porque o estado fica no
// banco, não em memória do processo serverless.
const INTERVALO_MINIMO_MS = 4_000;
const INTERVALO_JITTER_MS = 5_000; // soma um extra aleatório de 0-5s por cima do mínimo
const ESPERA_MAXIMA_MS = 10_000; // nunca trava a ação por mais que isso

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function respeitarEspacamentoAntiBan(admin: ReturnType<typeof createAdminClient>): Promise<{ id: string } | null> {
  const { data: linha } = await admin.from("integracoes_whatsapp_prostec").select("id, ultimo_envio_em").maybeSingle();
  if (!linha) return null;

  if (linha.ultimo_envio_em) {
    const decorrido = Date.now() - new Date(linha.ultimo_envio_em).getTime();
    const alvo = INTERVALO_MINIMO_MS + Math.random() * INTERVALO_JITTER_MS;
    const faltando = Math.min(alvo - decorrido, ESPERA_MAXIMA_MS);
    if (faltando > 0) await sleep(faltando);
  }

  return { id: linha.id };
}

export async function enviarMensagemProstec(telefone: string, texto: string): Promise<{ enviado: boolean; motivo?: string }> {
  const admin = createAdminClient();
  try {
    const linha = await respeitarEspacamentoAntiBan(admin);

    const response = await fetch(`${bridgeUrl()}/enviar`, {
      method: "POST", headers: headers(), body: JSON.stringify({ telefone, texto }), signal: AbortSignal.timeout(15_000),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { enviado: false, motivo: data?.erro ?? "Bridge da Prostec recusou o envio" };

    if (linha) {
      await admin
        .from("integracoes_whatsapp_prostec")
        .update({ status: "conectado", ultima_conexao: new Date().toISOString(), ultimo_envio_em: new Date().toISOString() })
        .eq("id", linha.id);
    }
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
