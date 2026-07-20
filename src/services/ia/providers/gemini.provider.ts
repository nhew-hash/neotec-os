import type { AIProvider, AICompletarInput, AICompletarResultado } from "./ai-provider.types";

/**
 * Ainda não implementado — a interface já está pronta pra receber a
 * implementação de verdade quando fizer sentido priorizar. Selecionar
 * esse provedor na tela de Configurações dá um erro claro em vez de
 * falhar silenciosamente.
 */
export class GeminiProvider implements AIProvider {
  readonly nome = "Google Gemini";

  constructor(private readonly modelo: string) {}

  async completar(_input: AICompletarInput): Promise<AICompletarResultado> {
    throw new Error("Provedor Gemini ainda não foi implementado. Selecione OpenAI ou Anthropic por enquanto.");
  }
}
