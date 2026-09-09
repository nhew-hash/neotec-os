import type { AIProvider, AICompletarInput, AICompletarResultado } from "./ai-provider.types";

/**
 * Ainda não implementado — reservado pra um modelo rodando localmente
 * (ex: Ollama), sem depender de API externa nenhuma. A interface já
 * está pronta; falta só a implementação quando isso virar prioridade.
 */
export class LocalProvider implements AIProvider {
  readonly nome = "Modelo local";

  async completar(_input: AICompletarInput): Promise<AICompletarResultado> {
    throw new Error("Provedor local ainda não foi implementado. Selecione OpenAI ou Anthropic por enquanto.");
  }
}
