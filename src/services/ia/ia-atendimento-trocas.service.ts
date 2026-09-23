import { createAdminClient } from "@/lib/supabase/admin";
import { avaliarPorModeloId } from "@/services/trade-in/aplicacao.service";

/**
 * Consulta de valor de troca pra IA de atendimento — MESMO motor e
 * MESMA tabela usados no site e no Neotec OS (Fase 236). A Iara nunca
 * calcula nada sozinha: só repete o que este service devolve, do
 * mesmo jeito que já faz com preço de venda em
 * `buscarPrecoParaAtendimento`.
 *
 * Sem checklist completo dentro do WhatsApp, a estimativa aqui é o
 * teto (aparelho em ótimo estado, sem nenhuma avaria marcada) — a
 * resposta deixa claro que é "em ótimo estado" e que o valor real
 * depende da avaliação física, igual ao disclaimer do site.
 */
export interface ResultadoTrocaAtendimento {
  modelo: string;
  valorEstimadoOtimoEstado: number;
}

export async function buscarValorTrocaParaAtendimento(termo: string): Promise<ResultadoTrocaAtendimento | null> {
  const admin = createAdminClient();
  const { data: modelos } = await admin
    .from("troca_modelos")
    .select("id, nome")
    .eq("ativo", true)
    .ilike("nome", `%${termo}%`)
    .limit(1);

  const modelo = modelos?.[0];
  if (!modelo) return null;

  const resultado = await avaliarPorModeloId(modelo.id, { avariasMarcadas: [], bateriaSaude: null }, admin);
  if (!resultado.encontrado) return null;

  return { modelo: resultado.modelo.nome, valorEstimadoOtimoEstado: resultado.resultado.valorFinal };
}

const PALAVRAS_TROCA = [
  "troca", "trocar", "trocaria", "entrada", "avaliar", "avaliação", "avaliacao",
  "usado", "seminovo no meu", "dar de entrada", "vale meu", "compram meu", "pagam no meu", "pagam pelo meu",
];

/** Heurística simples — sem chamar IA — só pra decidir se vale consultar o motor de troca antes de gerar a resposta. */
export function pareceInteressadoEmTroca(mensagem: string): boolean {
  const texto = mensagem.toLowerCase();
  return PALAVRAS_TROCA.some((p) => texto.includes(p));
}

const PALAVRAS_COMO_FUNCIONA_TROCA = [
  "como funciona a troca", "como funciona troca", "como faço pra trocar", "como faco pra trocar",
  "como faço a troca", "como é a troca", "formas de pagamento da troca", "formas de troca",
];

/** Heurística pra saber se o cliente quer entender o PROCESSO de troca (as 3 formas de comprar), não só o valor. */
export function pareceQuererEntenderProcessoDeTroca(mensagem: string): boolean {
  const texto = mensagem.toLowerCase();
  return PALAVRAS_COMO_FUNCIONA_TROCA.some((p) => texto.includes(p));
}
