"use server";

import { revalidatePath } from "next/cache";
import { configuracaoIASchema } from "./ia.schema";
import { salvarConfiguracaoIA } from "./providers/ia-provider-resolver";
import { executarPromptIA } from "./ia.service";
import type { ActionResult } from "@/types";

export async function salvarConfiguracaoIAAction(formData: FormData): Promise<ActionResult> {
  const raw = {
    provider: String(formData.get("provider") ?? ""),
    modelo: String(formData.get("modelo") ?? ""),
    ativo: formData.get("ativo") === "on",
    atendimento_automatico_ativo: formData.get("atendimento_automatico_ativo") === "on",
    temperatura: String(formData.get("temperatura") ?? "0.2"),
    limite_tokens: String(formData.get("limite_tokens") ?? "4000"),
    prompt_sistema: String(formData.get("prompt_sistema") ?? ""),
  };

  const parsed = configuracaoIASchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  try {
    await salvarConfiguracaoIA(parsed.data);
    revalidatePath("/configuracoes/ia");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar configuração" };
  }
}

/** Chama a IA de verdade com um prompt trivial — valida que a chave e o modelo funcionam, sem esperar o primeiro uso real (Cotações). */
export async function testarConexaoIAAction(): Promise<ActionResult<{ resposta: string }>> {
  try {
    const resultado = await executarPromptIA({
      modulo: "teste_configuracao",
      prompt: "Responda apenas: 'Conexão funcionando.'",
    });
    return { success: true, data: { resposta: resultado.texto } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao testar conexão" };
  }
}
