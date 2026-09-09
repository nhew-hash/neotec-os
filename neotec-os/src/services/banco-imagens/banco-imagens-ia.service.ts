import { z } from "zod";
import { executarPromptIA } from "@/services/ia/ia.service";

const identificacaoSchema = z.object({
  marca: z.string(),
  modelo: z.string(),
  cor: z.string().nullable().default(null),
  armazenamento: z.string().nullable().default(null),
});

export type IdentificacaoPasta = z.infer<typeof identificacaoSchema>;

// Rede de segurança — aplicada no RESULTADO da IA, não só ensinada no
// prompt. Garante a tradução mesmo se a IA não seguir a instrução
// (já vimos isso acontecer antes com outras regras).
const ALIAS_COR: Record<string, string> = {
  estelar: "Branco", starlight: "Branco", prateado: "Branco", silver: "Branco", "silver ": "Branco",
  "meia-noite": "Preto", "meia noite": "Preto", midnight: "Preto", grafite: "Preto", graphite: "Preto",
};

function traduzirCor(cor: string | null): string | null {
  if (!cor) return null;
  const chave = cor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  return ALIAS_COR[chave] ?? cor;
}

const PROMPT_SISTEMA = `Você identifica marca/modelo/cor/armazenamento a partir do nome de uma pasta de imagens de produto.

Exemplos:
"iPhone 13 Branco" → {"marca": "Apple", "modelo": "iPhone 13", "cor": "Branco", "armazenamento": null}
"Galaxy S24 Ultra Preto 256GB" → {"marca": "Samsung", "modelo": "Galaxy S24 Ultra", "cor": "Preto", "armazenamento": "256GB"}
"Redmi Note 15 Pro Azul" → {"marca": "Xiaomi", "modelo": "Redmi Note 15 Pro", "cor": "Azul", "armazenamento": null}
"JBL Go 4" → {"marca": "JBL", "modelo": "JBL Go 4", "cor": null, "armazenamento": null}
"Apple iPhone 14 (128 GB) - Estelar (Novo com caixa aberta)" → {"marca": "Apple", "modelo": "iPhone 14", "cor": "Branco", "armazenamento": "128GB"}

REGRA IMPORTANTE DE COR — nome de pasta baixada de anúncio (Mercado
Livre, loja online etc) costuma vir com o nome OFICIAL da Apple pra
cor, que é diferente do nome simplificado usado no resto do sistema
(o mesmo padrão que a Central de Cadastro já usa). SEMPRE traduza pro
nome simplificado, nunca deixa o nome oficial passar direto — sem
isso a vinculação automática com o estoque nunca bate:
- "Estelar"/"Starlight" → "Branco"
- "Meia-noite"/"Midnight" → "Preto"
- "Grafite"/"Graphite" → "Preto"
- "Prateado"/"Silver" → "Branco"
- "(PRODUCT)RED"/"Vermelho" → "Vermelho"
- "Titânio Natural"/"Titânio Preto"/"Titânio Azul"/"Titânio Branco"/qualquer "Titânio X" → "Titânio"
- Cores óbvias (Azul, Roxo, Verde, Amarelo, Rosa, Laranja) — mantém como estão, só remove o nome oficial se vier junto de outra coisa.

Regras gerais:
- "marca" é sempre o fabricante real (Apple, Samsung, Xiaomi, JBL, etc), mesmo que não apareça explícito no nome (ex: "iPhone" → marca "Apple").
- "modelo" é o nome completo do aparelho, sem a cor/armazenamento, e sem informação irrelevante tipo "(Novo com caixa aberta)", "MercadoLivre", número de anúncio, etc — só o nome do aparelho mesmo.
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

  return { ...parsed.data, cor: traduzirCor(parsed.data.cor) };
}
