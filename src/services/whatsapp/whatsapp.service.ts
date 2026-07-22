import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarLog } from "./whatsapp.logs";
import { processarAutomacaoNovaMensagem } from "./whatsapp.automacao";
import { processarRespostaIA } from "@/services/ia/ia-atendimento-orquestrador.service";
import { uploadMidiaWhatsapp, extensaoPorMimeType } from "./whatsapp-midia.service";
import { getActiveProvider } from "./providers/provider-resolver";
import { paraFormatoInternacionalBR, paraFormatoLocalBR } from "@/utils/telefone";
import type { DisparoWhatsapp, MensagemRecebidaNormalizada } from "./whatsapp.types";
import type { WhatsappConversa, WhatsappMensagem, Cliente } from "@/types";

/**
 * Ponto único de disparo de comunicação TRANSACIONAL (venda aprovada, OS
 * pronta, aniversário...) — mecanismo pré-existente desde a Fase 5/G,
 * mantido sem alteração. Continua só registrando na fila, não enviando
 * de verdade (ver `registrar_evento_whatsapp` no banco).
 */
export async function dispararEventoWhatsapp(disparo: DisparoWhatsapp): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("registrar_evento_whatsapp", {
    p_cliente_id: disparo.clienteId,
    p_evento: disparo.evento,
    p_telefone: disparo.telefone,
    p_variaveis: disparo.variaveis,
    p_loja_id: null,
  });

  if (error) {
    console.error(`Falha ao registrar evento WhatsApp (${disparo.evento}):`, error.message);
  }
}

// ============================================================================
// Central de Comunicação — conversas e mensagens (Fase 9)
// ============================================================================

export interface ConversaComCliente extends WhatsappConversa {
  cliente: Pick<Cliente, "id" | "nome"> | null;
}

export async function listarConversas(): Promise<ConversaComCliente[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("whatsapp_conversas")
    .select("*, cliente:clientes(id, nome)")
    .order("ultima_mensagem_em", { ascending: false, nullsFirst: false });

  if (error) throw new Error(`Não foi possível carregar as conversas: ${error.message}`);
  return (data ?? []) as unknown as ConversaComCliente[];
}

export async function listarMensagens(conversaId: string): Promise<WhatsappMensagem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("whatsapp_mensagens")
    .select("*")
    .eq("conversa_id", conversaId)
    .order("criado_em", { ascending: true });

  if (error) throw new Error(`Não foi possível carregar as mensagens: ${error.message}`);
  return (data ?? []) as unknown as WhatsappMensagem[];
}

export async function marcarConversaComoLida(conversaId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("whatsapp_conversas").update({ nao_lidas: 0 }).eq("id", conversaId);
}

/**
 * Envio de mensagem pela equipe. Passa pelo provider ATIVO no momento
 * (`getActiveProvider()`) — nunca chama Meta ou Bridge diretamente. Troca
 * de provedor na tela de Configurações muda esse comportamento na hora,
 * sem precisar alterar nenhum código.
 *
 * Sempre grava a mensagem no histórico (`whatsapp_mensagens`)
 * independente do envio real ter acontecido — `status_entrega` reflete
 * o resultado. Isso mantém a conversa auditável mesmo se o provedor
 * estiver desligado/indisponível.
 */
export async function enviarMensagem(input: {
  conversaId: string;
  telefone: string;
  texto: string;
  usuarioId: string;
}): Promise<WhatsappMensagem> {
  const supabase = await createClient();

  const { data: conversa } = await supabase
    .from("whatsapp_conversas")
    .select("jid_envio")
    .eq("id", input.conversaId)
    .maybeSingle();

  const provider = await getActiveProvider();
  const resultado = await provider.enviarTexto(
    paraFormatoInternacionalBR(input.telefone),
    input.texto,
    conversa?.jid_envio ?? undefined
  );

  await registrarLog({
    direcao: "saida",
    evento: "enviar_texto",
    payload: { telefone: input.telefone, texto: input.texto, provider: provider.nome },
    sucesso: resultado.enviado,
    erro: resultado.motivo,
  });

  const { data, error } = await supabase
    .from("whatsapp_mensagens")
    .insert({
      conversa_id: input.conversaId,
      direcao: "saida",
      tipo: "texto",
      conteudo: input.texto,
      status_entrega: resultado.enviado ? "enviado" : "erro",
      whatsapp_message_id: resultado.whatsappMessageId ?? null,
      enviado_por: input.usuarioId,
    })
    .select("*")
    .single();

  if (error) throw new Error(`Não foi possível registrar a mensagem: ${error.message}`);

  // Humano mandou mensagem nesta conversa — pausa a IA de atendimento
  // aqui automaticamente. É um "assumir conversa" implícito: se alguém
  // da equipe está respondendo na mão, a IA não deveria continuar
  // respondendo em paralelo na mesma conversa.
  await supabase
    .from("whatsapp_conversas")
    .update({ ultima_mensagem_em: new Date().toISOString(), ia_pausada: true })
    .eq("id", input.conversaId);

  return data as unknown as WhatsappMensagem;
}

/**
 * Mesmo caminho de envio de `enviarMensagem`, mas usado pela IA de
 * Atendimento — marca `enviado_por_ia: true` (pro selo visual no chat) e
 * NÃO define `enviado_por` (não foi nenhum usuário humano que mandou).
 * Diferente de `enviarMensagem`, não mexe em `ia_pausada` — quem decide
 * pausar é o orquestrador da IA, não o envio em si.
 */
export async function enviarMensagemIA(input: {
  conversaId: string;
  telefone: string;
  texto: string;
  jidEnvio?: string | null;
}): Promise<WhatsappMensagem> {
  // Service Role — mesma razão da Fase 37/38: roda dentro do
  // processamento de webhook, sem sessão de usuário. Com o client de
  // sessão, a gravação da mensagem falhava por RLS mesmo depois do
  // envio pelo WhatsApp já ter dado certo.
  const supabase = createAdminClient();
  const provider = await getActiveProvider();
  const resultado = await provider.enviarTexto(paraFormatoInternacionalBR(input.telefone), input.texto, input.jidEnvio ?? undefined);

  await registrarLog({
    direcao: "saida",
    evento: "enviar_texto_ia",
    payload: { telefone: input.telefone, texto: input.texto, provider: provider.nome },
    sucesso: resultado.enviado,
    erro: resultado.motivo,
  });

  const { data, error } = await supabase
    .from("whatsapp_mensagens")
    .insert({
      conversa_id: input.conversaId,
      direcao: "saida",
      tipo: "texto",
      conteudo: input.texto,
      status_entrega: resultado.enviado ? "enviado" : "erro",
      whatsapp_message_id: resultado.whatsappMessageId ?? null,
      enviado_por_ia: true,
    })
    .select("*")
    .single();

  if (error) throw new Error(`Não foi possível registrar a mensagem da IA: ${error.message}`);

  await supabase.from("whatsapp_conversas").update({ ultima_mensagem_em: new Date().toISOString() }).eq("id", input.conversaId);

  return data as unknown as WhatsappMensagem;
}

/**
 * Envia mídia (áudio gravado pela equipe) — sessão de usuário, mesmo
 * padrão de `enviarMensagem`. Gera a URL assinada temporária aqui
 * (dentro do sistema, que tem acesso ao Storage) e manda ela pro
 * provider — o Bridge/Meta não têm credencial pra acessar o Storage
 * direto, só recebem um link temporário já pronto pra baixar.
 */
export async function enviarMensagemComMidia(input: {
  conversaId: string;
  telefone: string;
  caminhoMidia: string;
  mimeType: string;
  usuarioId: string;
}): Promise<WhatsappMensagem> {
  const supabase = await createClient();

  const { data: conversa } = await supabase
    .from("whatsapp_conversas")
    .select("jid_envio")
    .eq("id", input.conversaId)
    .maybeSingle();

  const admin = createAdminClient();
  const { data: assinada, error: erroAssinatura } = await admin.storage
    .from("whatsapp-media")
    .createSignedUrl(input.caminhoMidia, 300);

  if (erroAssinatura || !assinada) {
    throw new Error(`Não foi possível gerar link temporário da mídia: ${erroAssinatura?.message}`);
  }

  const provider = await getActiveProvider();
  const resultado = await provider.enviarMidia(
    paraFormatoInternacionalBR(input.telefone),
    "audio",
    assinada.signedUrl,
    input.mimeType,
    conversa?.jid_envio ?? undefined
  );

  await registrarLog({
    direcao: "saida",
    evento: "enviar_midia",
    payload: { telefone: input.telefone, provider: provider.nome },
    sucesso: resultado.enviado,
    erro: resultado.motivo,
  });

  const { data, error } = await supabase
    .from("whatsapp_mensagens")
    .insert({
      conversa_id: input.conversaId,
      direcao: "saida",
      tipo: "audio",
      conteudo: null,
      url_midia: input.caminhoMidia,
      status_entrega: resultado.enviado ? "enviado" : "erro",
      whatsapp_message_id: resultado.whatsappMessageId ?? null,
      enviado_por: input.usuarioId,
    })
    .select("*")
    .single();

  if (error) throw new Error(`Não foi possível registrar a mensagem: ${error.message}`);

  await supabase
    .from("whatsapp_conversas")
    .update({ ultima_mensagem_em: new Date().toISOString(), ia_pausada: true })
    .eq("id", input.conversaId);

  return data as unknown as WhatsappMensagem;
}

/**
 * Envia uma foto do catálogo (Fase 43) — bucket público, URL já é
 * estável e final, diferente do áudio gravado (que usa link assinado
 * temporário porque o bucket de mídia de conversa é privado).
 *
 * Service Role Key de propósito: além da equipe (com sessão), a IA de
 * Atendimento também chama isso de dentro do webhook (sem sessão
 * nenhuma) — mesma lição das Fases 37-39.
 */
export async function enviarFotoCatalogo(input: {
  conversaId: string;
  telefone: string;
  urlFoto: string;
  legenda?: string;
  usuarioId?: string;
}): Promise<WhatsappMensagem> {
  const supabase = createAdminClient();

  const { data: conversa } = await supabase
    .from("whatsapp_conversas")
    .select("jid_envio")
    .eq("id", input.conversaId)
    .maybeSingle();

  const provider = await getActiveProvider();
  const resultado = await provider.enviarMidia(
    paraFormatoInternacionalBR(input.telefone),
    "imagem",
    input.urlFoto,
    "image/jpeg",
    conversa?.jid_envio ?? undefined,
    input.legenda
  );

  await registrarLog({
    direcao: "saida",
    evento: "enviar_midia",
    payload: { telefone: input.telefone, provider: provider.nome, tipo: "imagem" },
    sucesso: resultado.enviado,
    erro: resultado.motivo,
  });

  const { data, error } = await supabase
    .from("whatsapp_mensagens")
    .insert({
      conversa_id: input.conversaId,
      direcao: "saida",
      tipo: "imagem",
      conteudo: input.legenda ?? null,
      url_midia: input.urlFoto, // já é URL pública final, não caminho — ver MidiaMensagem no ChatPanel
      status_entrega: resultado.enviado ? "enviado" : "erro",
      whatsapp_message_id: resultado.whatsappMessageId ?? null,
      enviado_por: input.usuarioId ?? null,
    })
    .select("*")
    .single();

  if (error) throw new Error(`Não foi possível registrar a mensagem: ${error.message}`);

  await supabase
    .from("whatsapp_conversas")
    .update({ ultima_mensagem_em: new Date().toISOString(), ia_pausada: true })
    .eq("id", input.conversaId);

  return data as unknown as WhatsappMensagem;
}

export async function enviarMensagemTemplate(input: {
  conversaId: string;
  telefone: string;
  templateId: string;
  nomeTemplate: string;
  idioma: string;
  variaveis: string[];
  corpoPreenchido: string;
  usuarioId: string;
}): Promise<WhatsappMensagem> {
  const supabase = await createClient();
  const provider = await getActiveProvider();
  const resultado = await provider.enviarTemplate(paraFormatoInternacionalBR(input.telefone), input.nomeTemplate, input.idioma, input.variaveis);

  await registrarLog({
    direcao: "saida",
    evento: "enviar_template",
    payload: { telefone: input.telefone, template: input.nomeTemplate, variaveis: input.variaveis, provider: provider.nome },
    sucesso: resultado.enviado,
    erro: resultado.motivo,
  });

  const { data, error } = await supabase
    .from("whatsapp_mensagens")
    .insert({
      conversa_id: input.conversaId,
      direcao: "saida",
      tipo: "template",
      conteudo: input.corpoPreenchido,
      template_id: input.templateId,
      status_entrega: resultado.enviado ? "enviado" : "erro",
      whatsapp_message_id: resultado.whatsappMessageId ?? null,
      enviado_por: input.usuarioId,
    })
    .select("*")
    .single();

  if (error) throw new Error(`Não foi possível registrar a mensagem: ${error.message}`);
  return data as unknown as WhatsappMensagem;
}

/**
 * Recebimento de mensagem — chamado tanto pelo webhook da Meta quanto
 * pelo endpoint que recebe evento do Bridge do WhatsApp Web. Os dois
 * traduzem o payload específico deles pra este formato normalizado antes
 * de chamar esta função — a lógica de "achar/criar cliente, abrir
 * conversa, gravar mensagem, rodar automação" existe só aqui, uma vez.
 *
 * Roda com a Service Role Key (sem sessão de usuário — é uma chamada
 * servidor-a-servidor, seja da Meta ou do Bridge).
 */
export async function receberMensagemNormalizada(msg: MensagemRecebidaNormalizada): Promise<void> {
  const supabase = createAdminClient();

  await registrarLog({
    direcao: "entrada",
    evento: "mensagem_recebida",
    payload: { telefone: msg.telefone, tipo: msg.tipo, idExterno: msg.idExterno },
    sucesso: true,
  });

  // Antes de qualquer outra coisa: essa mensagem é o vendedor
  // respondendo uma pergunta que a IA fez? Se for, não é um lead novo,
  // não roda automação nenhuma — vai direto pro fluxo de resposta.
  const { data: configIA } = await supabase.from("configuracoes_ia").select("numero_vendedor_perguntas").maybeSingle();
  if (configIA?.numero_vendedor_perguntas) {
    const telefoneLocalRecebido = paraFormatoLocalBR(msg.telefone);
    if (telefoneLocalRecebido === configIA.numero_vendedor_perguntas.replace(/\D/g, "")) {
      const { processarRespostaVendedor } = await import("@/services/ia/ia-pergunta-equipe.service");
      await processarRespostaVendedor(msg.conteudo);
      return;
    }
  }

  let { data: conversa } = await supabase
    .from("whatsapp_conversas")
    .select("*")
    .eq("telefone", msg.telefone)
    .eq("status", "aberta")
    .maybeSingle();

  if (!conversa) {
    const { data: novaConversa, error } = await supabase
      .from("whatsapp_conversas")
      .insert({ telefone: msg.telefone, status: "aberta", jid_envio: msg.jidOriginal ?? null })
      .select("*")
      .single();
    if (error || !novaConversa) throw new Error(`Não foi possível criar a conversa: ${error?.message}`);
    conversa = novaConversa;
  } else if (msg.jidOriginal && conversa.jid_envio !== msg.jidOriginal) {
    // Atualiza se o JID mudou (ex: WhatsApp resolveu o LID pro número
    // real numa mensagem seguinte) — não custa manter atualizado.
    await supabase.from("whatsapp_conversas").update({ jid_envio: msg.jidOriginal }).eq("id", conversa.id);
  }

  let urlMidia: string | null = null;
  if (msg.midiaBase64 && msg.midiaMimeType) {
    try {
      const bytes = Buffer.from(msg.midiaBase64, "base64");
      urlMidia = await uploadMidiaWhatsapp(conversa.id, bytes, extensaoPorMimeType(msg.midiaMimeType));
    } catch (err) {
      // Não trava o recebimento da mensagem por causa disso — só fica
      // sem a mídia anexada, o texto/legenda continua chegando normal.
      console.error("Falha ao salvar mídia recebida:", err);
    }
  }

  await supabase.from("whatsapp_mensagens").insert({
    conversa_id: conversa.id,
    direcao: "entrada",
    tipo: msg.tipo,
    conteudo: msg.conteudo,
    whatsapp_message_id: msg.idExterno,
    status_entrega: "entregue",
    url_midia: urlMidia,
  });

  await supabase
    .from("whatsapp_conversas")
    .update({
      ultima_mensagem_em: new Date().toISOString(),
      nao_lidas: (conversa.nao_lidas ?? 0) + 1,
      primeira_resposta_em: conversa.primeira_resposta_em ?? null,
    })
    .eq("id", conversa.id);

  // Automação de CRM (lead/card) — sem IA nenhuma, regra determinística (ver whatsapp.automacao.ts)
  try {
    await processarAutomacaoNovaMensagem({ telefone: msg.telefone, nomeContato: msg.nomeContato, conversaId: conversa.id });
  } catch (err) {
    console.error("Falha na automação de nova mensagem:", err);
  }

  // IA de Atendimento — busca a conversa de novo porque a automação
  // acima pode ter setado card_id/cliente_id que não existiam antes.
  try {
    const { data: conversaAtualizada } = await supabase.from("whatsapp_conversas").select("*").eq("id", conversa.id).maybeSingle();
    if (conversaAtualizada) {
      await processarRespostaIA(conversaAtualizada, msg.conteudo);
    }
  } catch (err) {
    console.error("Falha na IA de atendimento:", err);
  }
}

/** Total de conversas com mensagem não lida — usado no badge do menu lateral. */
export async function contarConversasNaoLidas(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase.from("whatsapp_conversas").select("*", { count: "exact", head: true }).gt("nao_lidas", 0);
  return count ?? 0;
}
