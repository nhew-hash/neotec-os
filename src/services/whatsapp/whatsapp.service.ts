import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarTexto, enviarTemplate } from "./whatsapp.api";
import { registrarLog } from "./whatsapp.logs";
import { processarAutomacaoNovaMensagem } from "./whatsapp.automacao";
import type { DisparoWhatsapp } from "./whatsapp.types";
import type { WhatsappConversa, WhatsappMensagem, Cliente, MetaWebhookMensagem } from "@/types";

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
 * Envio de mensagem pela equipe. Sempre grava a mensagem no histórico
 * (`whatsapp_mensagens`) independente do envio real ter acontecido —
 * `status_entrega` reflete o resultado (`enviado` se a API respondeu ok,
 * `erro` se a integração está desativada ou falhou). Isso mantém a
 * conversa auditável mesmo enquanto a integração real está desligada.
 */
export async function enviarMensagem(input: {
  conversaId: string;
  telefone: string;
  texto: string;
  usuarioId: string;
}): Promise<WhatsappMensagem> {
  const supabase = await createClient();
  const resultado = await enviarTexto(input.telefone, input.texto);

  await registrarLog({
    direcao: "saida",
    evento: "enviar_texto",
    payload: { telefone: input.telefone, texto: input.texto },
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

  await supabase.from("whatsapp_conversas").update({ ultima_mensagem_em: new Date().toISOString() }).eq("id", input.conversaId);

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
  const resultado = await enviarTemplate(input.telefone, input.nomeTemplate, input.idioma, input.variaveis);

  await registrarLog({
    direcao: "saida",
    evento: "enviar_template",
    payload: { telefone: input.telefone, template: input.nomeTemplate, variaveis: input.variaveis },
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
 * Recebimento de mensagem via webhook da Meta. Roda com a Service Role
 * Key (sem sessão de usuário — é uma chamada servidor-a-servidor da
 * Meta). Cria a conversa se for o primeiro contato desse telefone, grava
 * a mensagem, e dispara a automação (lead → cliente → follow-up → CRM).
 */
export async function receberMensagemWebhook(
  telefone: string,
  nomeContato: string | undefined,
  mensagem: MetaWebhookMensagem
): Promise<void> {
  const supabase = createAdminClient();

  await registrarLog({
    direcao: "entrada",
    evento: "webhook_mensagem",
    payload: { telefone, mensagem },
    sucesso: true,
  });

  let { data: conversa } = await supabase
    .from("whatsapp_conversas")
    .select("*")
    .eq("telefone", telefone)
    .eq("status", "aberta")
    .maybeSingle();

  if (!conversa) {
    const { data: novaConversa, error } = await supabase
      .from("whatsapp_conversas")
      .insert({ telefone, status: "aberta" })
      .select("*")
      .single();
    if (error || !novaConversa) throw new Error(`Não foi possível criar a conversa: ${error?.message}`);
    conversa = novaConversa;
  }

  const conteudo =
    mensagem.type === "text" ? mensagem.text?.body ?? "" :
    mensagem.type === "image" ? (mensagem.image?.caption ?? "[Imagem]") :
    mensagem.type === "document" ? (mensagem.document?.filename ?? "[Documento]") :
    "[Áudio]";

  const tipoMensagem =
    mensagem.type === "text" ? "texto" :
    mensagem.type === "image" ? "imagem" :
    mensagem.type === "document" ? "documento" : "audio";

  await supabase.from("whatsapp_mensagens").insert({
    conversa_id: conversa.id,
    direcao: "entrada",
    tipo: tipoMensagem,
    conteudo,
    whatsapp_message_id: mensagem.id,
    status_entrega: "entregue",
  });

  await supabase
    .from("whatsapp_conversas")
    .update({
      ultima_mensagem_em: new Date().toISOString(),
      nao_lidas: (conversa.nao_lidas ?? 0) + 1,
      primeira_resposta_em: conversa.primeira_resposta_em ?? null,
    })
    .eq("id", conversa.id);

  // Automação — preparada, sem IA (ver whatsapp.automacao.ts)
  try {
    await processarAutomacaoNovaMensagem({ telefone, nomeContato, conversaId: conversa.id });
  } catch (err) {
    console.error("Falha na automação de nova mensagem:", err);
  }
}
