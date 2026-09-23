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
"Apple iPhone 14 (128 GB) - Estelar (Novo com caixa aberta)" → {"marca": "Apple", "modelo": "iPhone 14", "cor": "Estelar", "armazenamento": "128GB"}
"iPhone 15 Pro Titânio Natural" → {"marca": "Apple", "modelo": "iPhone 15 Pro", "cor": "Titânio Natural", "armazenamento": null}

REGRA IMPORTANTE DE COR (Fase 247) — devolva sempre o nome OFICIAL da
cor, exatamente como o fabricante chama (Estelar, Meia-noite, Titânio
Natural, Titânio Preto, Titânio Azul, Titânio Branco, Prateado, etc).
NUNCA simplifique ou traduza a cor aqui (ex: nunca troque "Estelar" por
"Branco", nem "Titânio Natural" por "Titânio" genérico) — isso
colapsaria cores diferentes num grupo só (ex: os 4 titânios do iPhone
15 Pro virariam um grupo só e perderiam a cor real). A tradução pro
nome simplificado usado no estoque é feita automaticamente depois, sem
perder a identidade da cor oficial.

Regras gerais:
- "marca" é sempre o fabricante real (Apple, Samsung, Xiaomi, JBL, etc), mesmo que não apareça explícito no nome (ex: "iPhone" → marca "Apple").
- "modelo" é o nome completo do aparelho, sem a cor/armazenamento, e sem informação irrelevante tipo "(Novo com caixa aberta)", "MercadoLivre", número de anúncio, etc — só o nome do aparelho mesmo.
- "cor" e "armazenamento" ficam null quando não aparecem no nome da pasta — nunca invente.

Responda APENAS com um objeto JSON no formato:
{"marca": "...", "modelo": "...", "cor": null, "armazenamento": null}`;

/**
 * Nunca aplica nada sozinho — só identifica, pra equipe confirmar antes
 * de vincular a pasta a um grupo do banco de imagens.
 *
 * A partir da Fase 247 a cor devolvida é sempre a OFICIAL — antes desta
 * fase essa função colapsava a cor (Estelar→Branco, Titânio X→Titânio)
 * na própria identificação, o que fazia os 4 titânios do iPhone 15 Pro
 * virarem um grupo só. Quem decide os nomes equivalentes pra casar com
 * o estoque agora é `equivalentesPadraoParaCor()` em
 * `correspondencia.ts`, aplicado só como `cores_equivalentes` do grupo
 * (nunca como a cor do grupo em si).
 */
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
