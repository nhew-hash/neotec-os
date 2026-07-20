import type { AIProvider, AICompletarInput, AICompletarResultado } from "./ai-provider.types";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const TIMEOUT_MS = 30_000;

export class OpenAIProvider implements AIProvider {
  readonly nome = "OpenAI";

  constructor(private readonly modelo: string) {}

  async completar(input: AICompletarInput): Promise<AICompletarResultado> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY não configurada — defina a variável de ambiente pra ativar a IA.");
    }

    const mensagens = [
      ...(input.sistema ? [{ role: "system", content: input.sistema }] : []),
      { role: "user", content: input.prompt },
    ];

    const corpo: Record<string, unknown> = {
      model: this.modelo,
      messages: mensagens,
      temperature: input.temperatura ?? 0.2,
      max_tokens: input.maxTokens ?? 4000,
    };

    if (input.formatoJson) {
      corpo.response_format = { type: "json_object" };
    }

    const resposta = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(corpo),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(dados?.error?.message ?? `Erro desconhecido da OpenAI (status ${resposta.status})`);
    }

    return {
      texto: dados?.choices?.[0]?.message?.content ?? "",
      tokensEntrada: dados?.usage?.prompt_tokens,
      tokensSaida: dados?.usage?.completion_tokens,
    };
  }
}
