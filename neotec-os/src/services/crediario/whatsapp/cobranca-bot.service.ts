import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveAIProvider } from "@/services/ia/providers/ia-provider-resolver";
import { enviarMensagemCobranca } from "./cobranca-whatsapp.provider";
import { formatCurrency, formatDate } from "@/utils";

/**
 * Bot de cobrança — deliberadamente LIMITADO. Só responde perguntas
 * simples e conhecidas (qual minha parcela, quando vence, quero
 * boleto/pix, já paguei). NUNCA analisa crédito, aprova, negocia,
 * dá desconto, promete condição, ou faz cobrança agressiva — regra
 * explícita e não-negociável do documento.
 *
 * Qualquer coisa fora das intenções conhecidas SEMPRE escala pra
 * humano — o bot nunca tenta "se virar" com uma pergunta que não
 * reconhece.
 */

// Intenções que o bot pode responder sozinho.
type IntentConhecido = "consultar_parcela" | "pedir_boleto" | "pedir_pix" | "segunda_via" | "confirmar_pagamento" | "outro";

// Palavras-chave que SEMPRE escalam — nunca passam pela lógica normal, mesmo que pareçam simples à primeira vista.
const GATILHOS_ESCALADA = [
  "não consigo pagar", "nao consigo pagar", "quero negociar", "quero desconto", "quero mudar",
  "não reconheço", "nao reconheco", "problema com o aparelho", "quero cancelar", "advogado", "procon", "processar",
];

function contemGatilhoEscalada(texto: string): boolean {
  const lower = texto.toLowerCase();
  return GATILHOS_ESCALADA.some((g) => lower.includes(g));
}

async function classificarIntentCobranca(texto: string): Promise<IntentConhecido> {
  try {
    const { provider } = await getActiveAIProvider();
    const resultado = await provider.completar({
      sistema: `Classifique a mensagem de um cliente sobre cobrança de parcela em UMA destas categorias exatas: consultar_parcela, pedir_boleto, pedir_pix, segunda_via, confirmar_pagamento, outro.
Use "outro" pra qualquer coisa que não seja claramente uma dessas 5 perguntas simples — nunca force encaixe.
Responda só JSON: {"intent": "..."}`,
      prompt: texto, formatoJson: true, temperatura: 0, maxTokens: 30,
    });
    const parsed = JSON.parse(resultado.texto.replace(/```json|```/g, "").trim());
    const validos: IntentConhecido[] = ["consultar_parcela", "pedir_boleto", "pedir_pix", "segunda_via", "confirmar_pagamento", "outro"];
    return validos.includes(parsed.intent) ? parsed.intent : "outro";
  } catch {
    return "outro"; // se a IA falhar, nunca assume — trata como "outro" e escala
  }
}

async function registrarMensagem(conversaId: string, remetente: "cliente" | "bot" | "humano", conteudo: string) {
  const admin = createAdminClient();
  await admin.from("crediario_mensagens").insert({ conversa_id: conversaId, remetente, conteudo });
  await admin.from("crediario_conversas").update({ ultima_mensagem_em: new Date().toISOString() }).eq("id", conversaId);
}

async function escalarParaHumano(conversaId: string, motivo: string) {
  const admin = createAdminClient();
  await admin.from("crediario_conversas").update({ bot_ativo: false }).eq("id", conversaId);
  await admin.from("crediario_cobranca_eventos").insert({ tipo: "escalado_humano", descricao: motivo });
}

export async function processarMensagemCobranca(telefone: string, textoRecebido: string): Promise<void> {
  const admin = createAdminClient();

  const { data: conversa } = await admin
    .from("crediario_conversas")
    .select("*, contrato:contratos(id, cliente_id, cliente:clientes(nome))")
    .eq("telefone", telefone)
    .maybeSingle();
  if (!conversa) return; // número não é cliente de crediário conhecido — ignora

  await registrarMensagem(conversa.id, "cliente", textoRecebido);
  if (!conversa.bot_ativo) return; // já escalado — humano assumiu, bot nunca mais responde nessa conversa

  // Gatilho de escalada por palavra-chave — checagem determinística, mais rápida e confiável que esperar a IA classificar.
  if (contemGatilhoEscalada(textoRecebido)) {
    await escalarParaHumano(conversa.id, "Cliente mencionou termo que exige atendimento humano (negociação/reclamação/etc.)");
    const texto = "Entendi. Já vou te conectar com nosso time pra resolver isso direitinho, só um instante 🙂";
    const resultado = await enviarMensagemCobranca(telefone, texto);
    if (resultado.enviado) await registrarMensagem(conversa.id, "bot", texto);
    return;
  }

  const intent = await classificarIntentCobranca(textoRecebido);
  const contrato = conversa.contrato as unknown as { id: string; cliente_id: string; cliente: { nome: string } | null } | null;

  if (intent === "outro" || !contrato) {
    await escalarParaHumano(conversa.id, "Pergunta fora do escopo simples do bot (não é consulta de parcela/boleto/pix/pagamento)");
    const texto = "Boa pergunta! Vou te conectar com nosso time pra te ajudar melhor com isso.";
    const resultado = await enviarMensagemCobranca(telefone, texto);
    if (resultado.enviado) await registrarMensagem(conversa.id, "bot", texto);
    return;
  }

  const { data: proximaParcela } = await admin
    .from("crediario_parcelas")
    .select("*")
    .eq("contrato_id", contrato.id)
    .in("status", ["pendente", "vencendo", "atrasado"])
    .order("vencimento")
    .limit(1)
    .maybeSingle();

  let texto: string;

  if (!proximaParcela) {
    texto = "Não encontrei nenhuma parcela em aberto no seu contrato — se isso não fizer sentido, te conecto com nosso time.";
  } else if (intent === "consultar_parcela") {
    texto = `Sua próxima parcela é de ${formatCurrency(proximaParcela.valor_original)}, com vencimento em ${formatDate(proximaParcela.vencimento)}.`;
  } else if (intent === "pedir_boleto" || intent === "segunda_via") {
    texto = proximaParcela.boleto_url
      ? `Aqui está o link do seu boleto: ${proximaParcela.boleto_url}`
      : "Ainda não tem boleto gerado pra essa parcela — já vou pedir pro time gerar e te aviso por aqui.";
    if (!proximaParcela.boleto_url) await escalarParaHumano(conversa.id, "Cliente pediu boleto que ainda não foi gerado");
  } else if (intent === "pedir_pix") {
    texto = proximaParcela.pix_copia_cola
      ? `Aqui está o Pix copia e cola: ${proximaParcela.pix_copia_cola}`
      : "Ainda não tem Pix gerado pra essa parcela — já vou pedir pro time gerar e te aviso por aqui.";
    if (!proximaParcela.pix_copia_cola) await escalarParaHumano(conversa.id, "Cliente pediu Pix que ainda não foi gerado");
  } else {
    // confirmar_pagamento
    texto = "Anotado! Assim que o pagamento for identificado no sistema, atualizo automaticamente por aqui. Obrigado por avisar 🙂";
  }

  const resultado = await enviarMensagemCobranca(telefone, texto);
  if (resultado.enviado) await registrarMensagem(conversa.id, "bot", texto);
}
