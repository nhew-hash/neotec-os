/**
 * "Ok", "blz", "obrigado"… — mensagem do cliente que só confirma/agradece e
 * não pede nada. Usada para a conversa NÃO contar como "precisa responder"
 * quando a loja já tinha respondido antes. Conservador de propósito: qualquer
 * pergunta, pedido ou "aguardo" (o cliente espera algo da loja) NÃO é encerramento.
 */
const FRASES = new Set([
  "ok", "okay", "oks", "okk", "okok", "ok ok", "ok obrigado", "ok obrigada", "ok tranquilo", "ok blz", "ok beleza", "ok valeu", "ok certo",
  "blz", "beleza", "belezinha", "bele", "show", "top", "perfeito", "otimo", "certo", "certinho", "combinado", "fechado", "tranquilo", "tranquilo obrigado",
  "ta bom", "ta bom obrigado", "ta bom obrigada", "ta otimo", "tudo bem", "tudo certo", "entendi", "entendi obrigado", "entendi obrigada", "ah ta", "aa ta", "a ta", "ata", "aham", "uhum", "sim obrigado", "sim obrigada",
  "obrigado", "obrigada", "obg", "obgd", "brigado", "brigada", "muito obrigado", "muito obrigada", "obrigado mesmo", "obrigada mesmo", "valeu", "vlw", "valeu obrigado", "tmj", "de nada",
  "eu que agradeco", "nos que agradecemos", "agradeco", "grato", "grata", "ate", "ate mais", "ate logo", "ate amanha", "boa noite", "bom descanso", "falou", "flw",
]);
const SO_EMOJI = /^[\p{Extended_Pictographic}\p{Emoji_Modifier}‍️\s]+$/u;
const NUNCA = /\?|aguard|espero|quando|quanto|pode |manda|me (passa|fala|envia)|preciso|quero|tem |voce|vc |onde/;

export function normalizarMensagem(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[!.,;:…]+/g, " ").replace(/(.)\1{2,}/g, "$1$1").replace(/\s+/g, " ").trim();
}

export function ehMensagemDeEncerramento(texto: string | null | undefined): boolean {
  if (!texto) return false;
  const bruto = texto.trim();
  if (!bruto || bruto.length > 40) return false;
  if (SO_EMOJI.test(bruto)) return true; // 👍 🙏 ❤️
  const t = normalizarMensagem(bruto).replace(/[\p{Extended_Pictographic}‍️]/gu, "").trim();
  if (!t || NUNCA.test(t + " ")) return false;
  if (FRASES.has(t)) return true;
  // "ook", "okkk", "obrigadaa" etc. depois de reduzir repetições
  const sem = t.replace(/(.)\1+/g, "$1");
  return FRASES.has(sem);
}

/**
 * Precisa de resposta? Só se a última mensagem é do cliente e não é um
 * encerramento depois de a loja já ter respondido.
 */
export function conversaPareceEncerrada(ultimaEntrada: { texto: string | null; em: string } | null, ultimaSaidaEm: string | null): boolean {
  if (!ultimaEntrada || !ultimaSaidaEm) return false;
  if (new Date(ultimaEntrada.em).getTime() < new Date(ultimaSaidaEm).getTime()) return false; // já respondida
  return ehMensagemDeEncerramento(ultimaEntrada.texto);
}

/** Cliente sem resposta há mais que isso dificilmente volta sozinho: sai da fila e vira "retorno" ou é encerrada. */
export const DIAS_PARA_PARADA = 4;

export function conversaParada(ultimaEntradaEm: string | null | undefined, agora = new Date(), dias = DIAS_PARA_PARADA): boolean {
  if (!ultimaEntradaEm) return false;
  return agora.getTime() - new Date(ultimaEntradaEm).getTime() > dias * 86_400_000;
}
