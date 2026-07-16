import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { WhatsappLog, DirecaoMensagem } from "@/types";

/**
 * Toda chamada de API (envio) e todo webhook recebido gera uma linha em
 * `whatsapp_logs` — independente de sucesso ou falha. É o primeiro lugar
 * a olhar quando "a mensagem não chegou": aqui fica registrado se o
 * sistema tentou, o que a Meta/Bridge respondeu, e por quê falhou.
 *
 * Usa a Service Role Key de propósito: isto é infraestrutura de
 * auditoria, não dado de usuário — nunca deveria depender de política de
 * RLS (a tabela só tinha SELECT pra admin, nunca teve INSERT pra
 * ninguém, o que sempre fez esse log falhar silenciosamente).
 */
export async function registrarLog(input: {
  direcao: DirecaoMensagem;
  evento: string;
  payload: Record<string, unknown>;
  sucesso: boolean;
  erro?: string;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("whatsapp_logs").insert({
    direcao: input.direcao,
    evento: input.evento,
    payload: input.payload,
    sucesso: input.sucesso,
    erro: input.erro ?? null,
  });

  // Log que falha ao gravar não pode derrubar o fluxo que o originou.
  if (error) console.error("Falha ao gravar whatsapp_logs:", error.message);
}

export async function listarLogsRecentes(limite: number = 50): Promise<WhatsappLog[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("whatsapp_logs")
    .select("*")
    .order("criado_em", { ascending: false })
    .limit(limite);

  if (error) throw new Error(`Não foi possível carregar os logs: ${error.message}`);
  return (data ?? []) as unknown as WhatsappLog[];
}
