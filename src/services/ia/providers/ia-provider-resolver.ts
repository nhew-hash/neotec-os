import { createClient } from "@/lib/supabase/server";
import { OpenAIProvider } from "./openai.provider";
import { AnthropicProvider } from "./anthropic.provider";
import { GeminiProvider } from "./gemini.provider";
import { LocalProvider } from "./local.provider";
import type { AIProvider } from "./ai-provider.types";
import type { ConfiguracaoIA } from "@/types";

/**
 * Único lugar do sistema que decide "qual provedor de IA está ativo
 * agora, com qual modelo". Todo o resto chama `getActiveAIProvider()` —
 * nunca importa `OpenAIProvider`/`AnthropicProvider` diretamente.
 */
export async function buscarConfiguracaoIA(): Promise<ConfiguracaoIA | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("configuracoes_ia").select("*").maybeSingle();
  if (error) throw new Error(`Não foi possível carregar a configuração de IA: ${error.message}`);
  return data;
}

export async function getActiveAIProvider(): Promise<{ provider: AIProvider; config: ConfiguracaoIA }> {
  const config = await buscarConfiguracaoIA();

  if (!config) {
    throw new Error("Nenhuma configuração de IA encontrada para esta loja.");
  }
  if (!config.ativo) {
    throw new Error("A IA está desativada. Ative em Configurações → IA.");
  }

  const provider: AIProvider = (() => {
    switch (config.provider) {
      case "openai": return new OpenAIProvider(config.modelo);
      case "anthropic": return new AnthropicProvider(config.modelo);
      case "gemini": return new GeminiProvider(config.modelo);
      case "local": return new LocalProvider();
    }
  })();

  return { provider, config };
}

export async function salvarConfiguracaoIA(dados: {
  provider: string;
  modelo: string;
  ativo: boolean;
  atendimento_automatico_ativo: boolean;
  temperatura: number;
  limite_tokens: number;
  prompt_sistema?: string;
}): Promise<void> {
  const supabase = await createClient();

  const { data: linha, error: erroBusca } = await supabase.from("configuracoes_ia").select("id").maybeSingle();
  if (erroBusca) throw new Error(`Não foi possível localizar a configuração: ${erroBusca.message}`);
  if (!linha) throw new Error("Nenhuma configuração de IA encontrada para esta loja");

  const { error } = await supabase
    .from("configuracoes_ia")
    .update({
      provider: dados.provider,
      modelo: dados.modelo,
      ativo: dados.ativo,
      atendimento_automatico_ativo: dados.atendimento_automatico_ativo,
      temperatura: dados.temperatura,
      limite_tokens: dados.limite_tokens,
      prompt_sistema: dados.prompt_sistema || null,
    })
    .eq("id", linha.id);

  if (error) throw new Error(`Não foi possível salvar a configuração: ${error.message}`);
}

/** Quais provedores têm chave de API configurada no ambiente — nunca expõe o valor, só se existe. */
export function chavesConfiguradas(): Record<"openai" | "anthropic" | "gemini", boolean> {
  return {
    openai: Boolean(process.env.OPENAI_API_KEY),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    gemini: Boolean(process.env.GEMINI_API_KEY),
  };
}
