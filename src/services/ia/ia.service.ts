import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveAIProvider, buscarConfiguracaoIA } from "./providers/ia-provider-resolver";
import type { AICompletarInput, AICompletarResultado } from "./providers/ai-provider.types";
import type { IAProviderTipo } from "@/types";

const MAX_TENTATIVAS = 3;

/**
 * Custo aproximado em USD por 1.000 tokens — usado só pra dar uma ideia
 * de consumo na tela de Configurações, não é fatura oficial de ninguém.
 * Precisa ser atualizado manualmente se os provedores mudarem preço.
 */
const CUSTO_POR_MIL_TOKENS: Record<string, { entrada: number; saida: number }> = {
  "gpt-4o-mini": { entrada: 0.00015, saida: 0.0006 },
  "gpt-4o": { entrada: 0.0025, saida: 0.01 },
  "claude-sonnet-4-5": { entrada: 0.003, saida: 0.015 },
  "claude-haiku-4-5": { entrada: 0.0008, saida: 0.004 },
};

function estimarCusto(modelo: string, tokensEntrada?: number, tokensSaida?: number): number | null {
  const precos = CUSTO_POR_MIL_TOKENS[modelo];
  if (!precos || tokensEntrada == null || tokensSaida == null) return null;
  return (tokensEntrada / 1000) * precos.entrada + (tokensSaida / 1000) * precos.saida;
}

async function registrarLogIA(input: {
  modulo: string;
  provider: IAProviderTipo;
  modelo: string;
  sucesso: boolean;
  erro?: string;
  duracaoMs: number;
  tokensEntrada?: number;
  tokensSaida?: number;
  cacheHit?: boolean;
}): Promise<void> {
  // Service Role — mesma razão de sempre (whatsapp_logs): log é
  // infraestrutura de auditoria, não deveria depender de RLS de sessão.
  const supabase = createAdminClient();
  const custoEstimado = estimarCusto(input.modelo, input.tokensEntrada, input.tokensSaida);

  const { error } = await supabase.from("ia_logs").insert({
    modulo: input.modulo,
    provider: input.provider,
    modelo: input.modelo,
    tokens_entrada: input.tokensEntrada ?? null,
    tokens_saida: input.tokensSaida ?? null,
    custo_estimado_usd: custoEstimado,
    duracao_ms: input.duracaoMs,
    sucesso: input.sucesso,
    erro: input.erro ?? null,
    cache_hit: input.cacheHit ?? false,
  });

  if (error) console.error("Falha ao gravar ia_logs:", error.message);
}

async function buscarNoCache(cacheKey: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("ia_cache")
    .select("resposta, expira_em")
    .eq("cache_key", cacheKey)
    .maybeSingle();

  if (!data) return null;
  if (new Date(data.expira_em) < new Date()) return null;
  return data.resposta;
}

async function salvarNoCache(cacheKey: string, resposta: string, ttlMinutos: number): Promise<void> {
  const supabase = createAdminClient();
  const expiraEm = new Date(Date.now() + ttlMinutos * 60_000).toISOString();
  await supabase.from("ia_cache").upsert({ cache_key: cacheKey, resposta, expira_em: expiraEm });
}

export interface ExecutarPromptIAInput extends AICompletarInput {
  /** Nome do módulo chamando (ex: "cotacoes", "atendimento") — vira o `modulo` no log. */
  modulo: string;
  /** Se informado, tenta servir do cache antes de chamar a IA de verdade, e salva o resultado pro próximo. */
  cacheKey?: string;
  /** Minutos até o cache expirar — só relevante se cacheKey foi informado. Padrão: 60. */
  cacheTtlMinutos?: number;
}

/**
 * Ponto ÚNICO de entrada pra IA no Neotec OS — toda chamada de qualquer
 * módulo (Central de Cotações, e futuramente CRM/Atendimento) passa por
 * aqui, nunca chama um provider diretamente. Isso é o que garante log,
 * cache e retry consistentes em qualquer lugar do sistema que usar IA.
 */
export async function executarPromptIA(input: ExecutarPromptIAInput): Promise<AICompletarResultado> {
  if (input.cacheKey) {
    const cache = await buscarNoCache(input.cacheKey);
    if (cache) {
      await registrarLogIA({
        modulo: input.modulo,
        provider: "openai", // não sabemos qual provider gerou o cache original sem guardar isso também; aceitável pra uma métrica só informativa
        modelo: "cache",
        sucesso: true,
        duracaoMs: 0,
        cacheHit: true,
      });
      return { texto: cache };
    }
  }

  const { provider, config } = await getActiveAIProvider();
  const inicio = Date.now();
  let ultimoErro: Error | null = null;

  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
    try {
      const resultado = await provider.completar({
        prompt: input.prompt,
        sistema: input.sistema ?? config.prompt_sistema ?? undefined,
        temperatura: input.temperatura ?? config.temperatura,
        maxTokens: input.maxTokens ?? config.limite_tokens,
        formatoJson: input.formatoJson,
      });

      await registrarLogIA({
        modulo: input.modulo,
        provider: config.provider,
        modelo: config.modelo,
        sucesso: true,
        duracaoMs: Date.now() - inicio,
        tokensEntrada: resultado.tokensEntrada,
        tokensSaida: resultado.tokensSaida,
      });

      if (input.cacheKey) {
        await salvarNoCache(input.cacheKey, resultado.texto, input.cacheTtlMinutos ?? 60);
      }

      return resultado;
    } catch (err) {
      ultimoErro = err instanceof Error ? err : new Error("Erro desconhecido ao chamar a IA");
      if (tentativa < MAX_TENTATIVAS) {
        // Backoff simples entre tentativas — 1s, 2s.
        await new Promise((resolve) => setTimeout(resolve, 1000 * tentativa));
      }
    }
  }

  await registrarLogIA({
    modulo: input.modulo,
    provider: config.provider,
    modelo: config.modelo,
    sucesso: false,
    erro: ultimoErro?.message,
    duracaoMs: Date.now() - inicio,
  });

  throw ultimoErro ?? new Error("Falha ao chamar a IA após múltiplas tentativas");
}

export { buscarConfiguracaoIA };
