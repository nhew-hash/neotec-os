import { createAdminClient } from "@/lib/supabase/admin";
import { enviarMensagemIA } from "@/services/whatsapp/whatsapp.service";
import { executarPromptIA } from "@/services/ia/ia.service";

/**
 * Em vez de só pausar a conversa e criar um follow-up (que exige o
 * dono entrar no sistema pra ver), a IA manda a pergunta direto pro
 * WhatsApp pessoal dele — e usa a resposta pra continuar atendendo o
 * cliente original, sem ninguém precisar abrir o Neotec OS.
 */
export async function perguntarParaEquipe(input: {
  conversaClienteId: string;
  cardId: string | null;
  numeroVendedor: string;
  pergunta: string;
}): Promise<void> {
  const supabase = createAdminClient();

  // Conversa "interna" com o vendedor — não é cliente, não passa pela
  // automação normal de lead (isso é checado em receberMensagemNormalizada,
  // não aqui). Reaproveita se já existir uma aberta com esse número.
  let { data: conversaVendedor } = await supabase
    .from("whatsapp_conversas")
    .select("id")
    .eq("telefone", input.numeroVendedor)
    .eq("status", "aberta")
    .maybeSingle();

  if (!conversaVendedor) {
    const { data: nova, error } = await supabase
      .from("whatsapp_conversas")
      .insert({ telefone: input.numeroVendedor, status: "aberta" })
      .select("id")
      .single();
    if (error || !nova) throw new Error(`Não foi possível criar conversa com o vendedor: ${error?.message}`);
    conversaVendedor = nova;
  }

  await enviarMensagemIA({
    conversaId: conversaVendedor.id,
    telefone: input.numeroVendedor,
    texto: `🤖 Preciso da sua ajuda com um cliente:\n\n${input.pergunta}\n\n_Responda essa mensagem que eu uso sua resposta pra continuar o atendimento._`,
  });

  await supabase.from("ia_perguntas_equipe").insert({
    conversa_cliente_id: input.conversaClienteId,
    card_id: input.cardId,
    pergunta: input.pergunta,
  });
}

/**
 * Chamado quando chega mensagem do número configurado como
 * "vendedor de perguntas" — assume que é resposta à pergunta mais
 * antiga ainda aguardando (fila simples, sem tentar casar por conteúdo).
 * Gera uma frase natural pro cliente em cima da resposta crua do
 * vendedor, e retoma o atendimento automático nessa conversa.
 */
export async function processarRespostaVendedor(respostaTexto: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: pergunta } = await supabase
    .from("ia_perguntas_equipe")
    .select("*")
    .eq("status", "aguardando")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!pergunta) return; // vendedor mandou mensagem sem nenhuma pergunta pendente — ignora, não é resposta de nada

  await supabase
    .from("ia_perguntas_equipe")
    .update({ resposta: respostaTexto, status: "respondida", respondida_em: new Date().toISOString() })
    .eq("id", pergunta.id);

  const { data: conversaCliente } = await supabase
    .from("whatsapp_conversas")
    .select("*")
    .eq("id", pergunta.conversa_cliente_id)
    .maybeSingle();

  if (!conversaCliente) return;

  let respostaFinal: string;
  try {
    const resultado = await executarPromptIA({
      modulo: "atendimento_pergunta_equipe",
      prompt: `Um cliente perguntou algo que eu não sabia responder, então perguntei pra equipe. A pergunta que fiz foi: "${pergunta.pergunta}"\n\nA equipe respondeu: "${respostaTexto}"\n\nTransforme isso numa mensagem natural pra mandar pro cliente, como se eu (a atendente) tivesse acabado de confirmar a informação. Não mencione que perguntou pra "equipe" ou "vendedor" — fale como se você mesma soubesse. Responda APENAS com a mensagem final, sem aspas.`,
      sistema: "Você adapta respostas internas em mensagens naturais de atendimento pra WhatsApp, tom cordial e direto.",
      temperatura: 0.4,
    });
    respostaFinal = resultado.texto.trim() || respostaTexto;
  } catch {
    // IA de fraseado falhou — manda a resposta crua mesmo, melhor que nada.
    respostaFinal = respostaTexto;
  }

  await enviarMensagemIA({
    conversaId: conversaCliente.id,
    telefone: conversaCliente.telefone,
    texto: respostaFinal,
    jidEnvio: conversaCliente.jid_envio,
  });

  // Retoma o atendimento automático — o vendedor só respondeu uma
  // pergunta pontual, não "assumiu" a conversa inteira.
  await supabase.from("whatsapp_conversas").update({ ia_pausada: false }).eq("id", conversaCliente.id);
}
