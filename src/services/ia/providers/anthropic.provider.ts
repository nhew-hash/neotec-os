import type { AIProvider, AICompletarInput, AICompletarResultado } from "./ai-provider.types";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const TIMEOUT_MS = 30_000;

export class AnthropicProvider implements AIProvider {
  readonly nome = "Anthropic";

  constructor(private readonly modelo: string) {}

  async completar(input: AICompletarInput): Promise<AICompletarResultado> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY não configurada — defina a variável de ambiente pra ativar esse provedor.");
    }

    // A API da Anthropic não tem um "response_format: json" nativo como
    // a OpenAI — a forma confiável de forçar JSON é reforçar isso no
    // próprio prompt de sistema.
    const sistema = input.formatoJson
      ? `${input.sistema ?? ""}\n\nResponda APENAS com um JSON válido, sem nenhum texto antes ou depois, sem markdown.`.trim()
      : input.sistema;

    const resposta = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.modelo,
        max_tokens: input.maxTokens ?? 4000,
        temperature: input.temperatura ?? 0.2,
        system: sistema,
        messages: [{ role: "user", content: input.prompt }],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(dados?.error?.message ?? `Erro desconhecido da Anthropic (status ${resposta.status})`);
    }

    return {
      texto: dados?.content?.[0]?.text ?? "",
      tokensEntrada: dados?.usage?.input_tokens,
      tokensSaida: dados?.usage?.output_tokens,
    };
  }
}
