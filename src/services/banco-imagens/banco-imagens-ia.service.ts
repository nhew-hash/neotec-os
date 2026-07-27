import { z } from "zod";
import { executarPromptIA } from "@/services/ia/ia.service";

const identificacaoSchema = z.object({
  marca: z.string(),
  modelo: z.string(),
  cor: z.string().nullable().default(null),
  armazenamento: z.string().nullable().default(null),
});

export type IdentificacaoPasta = z.infer<typeof identificacaoSchema>;

const PROMPT_SISTEMA = `Você identifica marca/modelo/cor/armazenamento a partir do nome de uma pasta de imagens de produto.

Exemplos:
"iPhone 13 Branco" → {"marca": "Apple", "modelo": "iPhone 13", "cor": "Branco", "armazenamento": null}
"Galaxy S24 Ultra Preto 256GB" → {"marca": "Samsung", "modelo": "Galaxy S24 Ultra", "cor": "Preto", "armazenamento": "256GB"}
"Redmi Note 15 Pro Azul" → {"marca": "Xiaomi", "modelo": "Redmi Note 15 Pro", "cor": "Azul", "armazenamento": null}
"JBL Go 4" → {"marca": "JBL", "modelo": "JBL Go 4", "cor": null, "armazenamento": null}

Regras:
- "marca" é sempre o fabricante real (Apple, Samsung, Xiaomi, JBL, etc), mesmo que não apareça explícito no nome (ex: "iPhone" → marca "Apple").
- "modelo" é o nome completo do aparelho, sem a cor/armazenamento.
- "cor" e "armazenamento" ficam null quando não aparecem no nome da pasta — nunca invente.

Responda APENAS com um objeto JSON no formato:
{"marca": "...", "modelo": "...", "cor": null, "armazenamento": null}`;

/** Nunca aplica nada sozinho — só identifica, pra equipe confirmar antes de vincular a pasta a um grupo do banco de imagens. */
export async function identificarPasta(nomePasta: string): Promise<IdentificacaoPasta> {
  const resultado = await executarPromptIA({
    modulo: "banco_imagens_identificacao",
    prompt: nomePasta,
    sistema: PROMPT_SISTEMA,
    temperatura: 0.1,
    formatoJson: true,
  });

  let bruto: unknown;
  try {
    bruto = JSON.parse(resultado.texto);
  } catch {
    throw new Error("Não consegui identificar o nome da pasta — tenta renomear pra algo tipo 'Modelo Cor' (ex: 'iPhone 13 Branco').");
  }

  const parsed = identificacaoSchema.safeParse(bruto);
  if (!parsed.success) throw new Error("A IA devolveu um formato inesperado ao identificar a pasta.");

  return parsed.data;
}
