import { createClient } from "@/lib/supabase/server";
import { executarPromptIA } from "@/services/ia/ia.service";
import type { MapeamentoEmojiCor } from "@/types";
import type { CotacaoItemFormValues } from "./cotacoes.schema";

async function buscarMapeamentoEmojiCor(): Promise<MapeamentoEmojiCor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("mapeamento_emoji_cor").select("*").order("emoji");
  if (error) throw new Error(`Não foi possível carregar o mapeamento de cores: ${error.message}`);
  return data ?? [];
}

/**
 * Monta o prompt de sistema com o mapa de emoji→cor ATUAL do banco (não
 * hard-coded) — é assim que "permitir cadastro futuro de emoji" funciona
 * sem precisar mexer em código: alguém cadastra um emoji novo na tela,
 * a próxima interpretação já usa ele.
 */
function montarPromptSistema(mapeamento: MapeamentoEmojiCor[]): string {
  const mapaTexto = mapeamento.map((m) => `${m.emoji} = ${m.cor}`).join("\n");

  return `Você é um especialista em interpretar listas de preço de fornecedores de celulares usados/seminovos/lacrados enviadas por WhatsApp, em português do Brasil.

O texto que você vai receber é uma mensagem real, colada sem edição — pode ter formatação bagunçada, abreviações, emojis, e o formato muda de fornecedor pra fornecedor. Sua tarefa é extrair cada aparelho como um item separado.

MAPA DE EMOJI PARA COR (use exatamente estas cores quando o emoji aparecer):
${mapaTexto}

REGRAS DE INTERPRETAÇÃO:

1. MODELO: normalize pro nome comercial completo. "17" sozinho = "iPhone 17". "16 PRO MAX" = "iPhone 16 Pro Max". "16 PRO" = "iPhone 16 Pro".

2. ARMAZENAMENTO: "256G" ou "256GB" = "256GB". Sempre com "GB" no final (ou "TB" se for terabyte).

3. SEQUÊNCIA DE BATERIA = MÚLTIPLOS APARELHOS. Isto é o mais importante: quando aparecer uma sequência como "90%⚫️90%🩶92%💛93%⚪️", isso significa QUATRO aparelhos diferentes do MESMO modelo/armazenamento, um pra cada combinação bateria+cor nessa sequência — não é um aparelho só com múltiplas informações. Exemplo:
"📲16 PRO MAX 256G 90%⚫️90%🩶92%💛93%⚪️5149" gera 4 itens, todos "iPhone 16 Pro Max", "256GB", preço 5149, mudando só bateria e cor:
- Preto, 90%
- Titânio Natural, 90%
- Dourado, 92%
- Branco, 93%

4. PREÇO: é o número no final da linha (ou logo antes de um texto de observação) — em reais, sem "R$", sem pontuação de milhar confundir com decimal (ex: "4499" = R$ 4.499,00, não R$ 4,499).

5. OBSERVAÇÕES: texto como "com detalhes de uso", "trocado", "face não funciona", "riscado" vai no campo observacao, NUNCA inventado — só o que estiver escrito.

6. GARANTIA: se o texto mencionar "garantia Apple", "30 dias", "garantia loja", "sem garantia" etc, preencha o campo garantia com isso. Se não mencionar nada sobre garantia PRA AQUELE ITEM especificamente, mas o cabeçalho da mensagem tiver uma garantia geral (ex: "Garantia 30 dias pela loja" no topo), aplique essa garantia geral a todos os itens que não tiverem uma garantia específica sobrescrevendo.

7. Se não conseguir identificar o preço de um item com confiança, NÃO invente um número — pule esse item (é melhor faltar um item do que ter um preço errado).

Responda APENAS com um JSON no formato:
{"itens": [{"modelo": "...", "armazenamento": "...", "cor": "...", "bateria_percentual": 90, "preco": 4499, "quantidade": 1, "garantia": "...", "observacao": "..."}]}

Campos "cor", "bateria_percentual", "garantia", "observacao" podem ser null se não houver informação. "quantidade" é sempre 1, a menos que o texto diga explicitamente "2x" ou similar. Nada de texto fora do JSON.`;
}

export interface ResultadoInterpretacaoIA {
  itens: CotacaoItemFormValues[];
  itensComProblema: number;
}

/**
 * Chama a IA (via executarPromptIA — provider-agnóstico, usa o que
 * estiver ativo em Configurações → IA) pra transformar o texto colado
 * em itens estruturados. Não salva nada — devolve pra tela mostrar a
 * prévia editável antes de qualquer gravação, como pedido na missão.
 */
export async function interpretarTextoCotacao(texto: string, categoria: string): Promise<ResultadoInterpretacaoIA> {
  const mapeamento = await buscarMapeamentoEmojiCor();
  const sistema = montarPromptSistema(mapeamento);

  const resultado = await executarPromptIA({
    modulo: "cotacoes",
    prompt: `Categoria informada pelo usuário: ${categoria}\n\nTexto da cotação:\n${texto}`,
    sistema,
    formatoJson: true,
    temperatura: 0.1, // baixa de propósito — extração estruturada, não criatividade
  });

  let bruto: unknown;
  try {
    bruto = JSON.parse(resultado.texto);
  } catch {
    throw new Error("A IA retornou um formato inesperado. Tente novamente, ou ajuste o texto colado.");
  }

  const itensBrutos = Array.isArray((bruto as { itens?: unknown })?.itens) ? (bruto as { itens: unknown[] }).itens : [];

  if (itensBrutos.length === 0) {
    throw new Error("Não foi possível identificar nenhum aparelho nesse texto. Confira se colou a mensagem completa.");
  }

  let itensComProblema = 0;
  const itens: CotacaoItemFormValues[] = [];

  for (const itemBruto of itensBrutos) {
    const i = itemBruto as Record<string, unknown>;
    const preco = Number(i.preco);
    const modelo = typeof i.modelo === "string" ? i.modelo.trim() : "";

    if (!modelo || Number.isNaN(preco) || preco <= 0) {
      itensComProblema += 1;
      continue;
    }

    itens.push({
      tipo_produto: "celular",
      modelo,
      armazenamento: typeof i.armazenamento === "string" ? i.armazenamento : "",
      cor: typeof i.cor === "string" ? i.cor : "",
      bateria_percentual: typeof i.bateria_percentual === "number" ? i.bateria_percentual : undefined,
      preco,
      quantidade: typeof i.quantidade === "number" && i.quantidade > 0 ? i.quantidade : 1,
      garantia: typeof i.garantia === "string" ? i.garantia : "",
      observacao: typeof i.observacao === "string" ? i.observacao : "",
    });
  }

  if (itens.length === 0) {
    throw new Error("A IA não conseguiu extrair nenhum item válido (preço ou modelo ausente em todos).");
  }

  return { itens, itensComProblema };
}
