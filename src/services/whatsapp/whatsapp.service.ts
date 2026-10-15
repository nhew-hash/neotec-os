import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarLog } from "./whatsapp.logs";
import { processarAutomacaoNovaMensagem } from "./whatsapp.automacao";
import { processarRespostaIA } from "@/services/ia/ia-atendimento-orquestrador.service";
import { uploadMidiaWhatsapp, extensaoPorMimeType } from "./whatsapp-midia.service";
import { getActiveProvider } from "./providers/provider-resolver";
import { paraFormatoInternacionalBR, paraFormatoLocalBR } from "@/utils/telefone";
import { detectarPedidoNaoContato } from "./trava-envio";
import { proximoStatusEntrega, statusMetaParaEntrega } from "./entrega-status";
import type { DisparoWhatsapp, MensagemRecebidaNormalizada } from "./whatsapp.types";
import type { WhatsappConversa, WhatsappMensagem, Cliente, StatusEntregaMensagem } from "@/types";

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

/**
 * Mensagem de saída já gravada no histórico + o motivo, quando o provedor
 * NÃO confirmou o envio. A mensagem é gravada de qualquer jeito (auditoria),
 * mas quem chama precisa olhar `status_entrega`/`motivoFalha` antes de dizer
 * "enviado" para a pessoa — ver `exigirEnvioConfirmado`.
 */
export type MensagemEnviada = WhatsappMensagem & { motivoFalha: string | null };

/** Lança erro legível quando o provedor não confirmou o envio. */
export function exigirEnvioConfirmado(msg: MensagemEnviada): void {
  if (msg.status_entrega === "erro") {
    throw new Error(`O WhatsApp não confirmou o envio — a mensagem NÃO saiu${msg.motivoFalha ? ` (${msg.motivoFalha})` : ""}. Ela ficou marcada com falha no histórico.`);
  }
}

/** Limite da lista lateral. Conversas mais antigas continuam acessíveis pela busca do servidor. */
export const LIMITE_CONVERSAS = 300;

export async function listarConversas(params?: { busca?: string }): Promise<ConversaComCliente[]> {
  const supabase = await createClient();
  let query = supabase
    .from("whatsapp_conversas")
    .select("*, cliente:clientes(id, nome)")
    .order("ultima_mensagem_em", { ascending: false, nullsFirst: false })
    .limit(LIMITE_CONVERSAS);

  const digitos = params?.busca?.replace(/\D/g, "") ?? "";
  if (digitos.length >= 4) query = query.ilike("telefone", `%${digitos.slice(-8)}%`);

  const { data, error } = await query;
  if (error) throw new Error(`Não foi possível carregar as conversas: ${error.message}`);
  return (data ?? []) as unknown as ConversaComCliente[];
}

/** Uma conversa só (antes, a página carregava a lista inteira para achar uma). */
export async function obterConversa(id: string): Promise<ConversaComCliente | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("whatsapp_conversas")
    .select("*, cliente:clientes(id, nome)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Não foi possível carregar a conversa: ${error.message}`);
  return (data ?? null) as unknown as ConversaComCliente | null;
}

/** Histórico carregado por página: as últimas N mensagens (antes, a conversa inteira de uma vez). */
export const LIMITE_MENSAGENS = 200;

export async function listarMensagens(conversaId: string, params?: { antesDe?: string; limite?: number }): Promise<{ mensagens: WhatsappMensagem[]; temMais: boolean }> {
  const limite = Math.min(Math.max(params?.limite ?? LIMITE_MENSAGENS, 1), 500);
  const supabase = await createClient();
  let query = supabase
    .from("whatsapp_mensagens")
    .select("*")
    .eq("conversa_id", conversaId)
    .order("criado_em", { ascending: false })
    .limit(limite + 1);
  if (params?.antesDe) query = query.lt("criado_em", params.antesDe);

  const { data, error } = await query;
  if (error) throw new Error(`Não foi possível carregar as mensagens: ${error.message}`);
  const linhas = (data ?? []) as unknown as WhatsappMensagem[];
  return { mensagens: linhas.slice(0, limite).reverse(), temMais: linhas.length > limite };
}

export async function marcarConversaComoLida(conversaId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("whatsapp_conversas").update({ nao_lidas: 0 }).eq("id", conversaId);
  if (error) throw new Error(`Não foi possível marcar a conversa como lida: ${error.message}`);
}

/**
 * Status de entrega vindos do webhook da Meta (`statuses[]`). Antes eles só
 * iam para o log: o chat nunca mostrava "entregue"/"lido"/"falhou" de verdade
 * (o hook de realtime da tela já escutava o UPDATE, mas nada atualizava).
 * O status só avança — ver `proximoStatusEntrega`.
 */
export async function atualizarStatusEntrega(evento: { whatsappMessageId: string; statusMeta: string }): Promise<boolean> {
  const recebido = statusMetaParaEntrega(evento.statusMeta);
  if (!recebido) return false;
  return aplicarStatusEntrega(evento.whatsappMessageId, recebido);
}

/** Mesmo avanço de status, já no vocabulário do Neotec OS (usado pela Bridge do WhatsApp Web). */
export async function aplicarStatusEntrega(whatsappMessageId: string, recebido: StatusEntregaMensagem): Promise<boolean> {
  const supabase = createAdminClient();
  const { data: atual, error } = await supabase
    .from("whatsapp_mensagens")
    .select("id, status_entrega")
    .eq("whatsapp_message_id", whatsappMessageId)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Falha ao ler mensagem para status de entrega: ${error.message}`);
  if (!atual) return false; // mensagem enviada fora do sistema (ou anterior a ele)

  const novo = proximoStatusEntrega(atual.status_entrega, recebido);
  if (!novo) return false;
  const { error: erroUpd } = await supabase
    .from("whatsapp_mensagens")
    .update({ status_entrega: novo, ...(novo === "lido" ? { lida_em: new Date().toISOString() } : {}) })
    .eq("id", atual.id);
  if (erroUpd) throw new Error(`Falha ao gravar status de entrega: ${erroUpd.message}`);
  return true;
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
}): Promise<MensagemEnviada> {
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
  const mensagem: MensagemEnviada = { ...(data as unknown as WhatsappMensagem), motivoFalha: resultado.enviado ? null : resultado.motivo ?? "provedor recusou o envio" };

  // Humano mandou mensagem nesta conversa — pausa a IA de atendimento
  // aqui automaticamente. É um "assumir conversa" implícito: se alguém
  // da equipe está respondendo na mão, a IA não deveria continuar
  // respondendo em paralelo na mesma conversa.
  await supabase
    .from("whatsapp_conversas")
    .update({ ultima_mensagem_em: new Date().toISOString(), ia_pausada: true })
    .eq("id", input.conversaId);

  return mensagem;
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
}): Promise<MensagemEnviada> {
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

  return { ...(data as unknown as WhatsappMensagem), motivoFalha: resultado.enviado ? null : resultado.motivo ?? "provedor recusou o envio" };
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
}): Promise<MensagemEnviada> {
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

  return { ...(data as unknown as WhatsappMensagem), motivoFalha: resultado.enviado ? null : resultado.motivo ?? "provedor recusou o envio" };
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
}): Promise<MensagemEnviada> {
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
  return { ...(data as unknown as WhatsappMensagem), motivoFalha: resultado.enviado ? null : resultado.motivo ?? "provedor recusou o envio" };
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

  // Trava de segurança (defesa em profundidade) — nenhuma mensagem de
  // texto de verdade vem vazia (o WhatsApp não deixa mandar texto em
  // branco). Se chegar isso aqui, é sinal de que a Bridge repassou
  // algum evento que não é mensagem real (reação, apagar mensagem,
  // enquete, confirmação de leitura etc.) — ignora, em vez de criar
  // atendimento novo ou poluir a conversa com "mensagem em branco".
  if (msg.tipo === "texto" && !msg.conteudo?.trim()) {
    await registrarLog({
      direcao: "entrada",
      evento: "mensagem_recebida",
      payload: { telefone: msg.telefone, tipo: msg.tipo, idExterno: msg.idExterno, ignorada: "texto vazio — provável evento não-mensagem (reação/status/protocolo)" },
      sucesso: true,
    });
    return;
  }

  // Idempotência: a Meta reenvia o mesmo evento quando não recebe 200 a
  // tempo (e o Bridge pode repetir após reconectar). Mensagem já gravada =
  // nada a fazer — sem isso, a automação e a IA rodavam duas vezes.
  if (msg.idExterno) {
    const { data: jaGravada, error: erroDup } = await supabase
      .from("whatsapp_mensagens")
      .select("id")
      .eq("whatsapp_message_id", msg.idExterno)
      .limit(1)
      .maybeSingle();
    if (erroDup) throw new Error(`Falha ao checar mensagem duplicada: ${erroDup.message}`);
    if (jaGravada) {
      await registrarLog({ direcao: "entrada", evento: "mensagem_duplicada_ignorada", payload: { idExterno: msg.idExterno }, sucesso: true });
      return;
    }
  }

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
    const numeroVendedorNormalizado = configIA.numero_vendedor_perguntas.replace(/\D/g, "");
    if (telefoneLocalRecebido === numeroVendedorNormalizado) {
      const { processarRespostaVendedor } = await import("@/services/ia/ia-pergunta-equipe.service");
      await processarRespostaVendedor(msg.conteudo);
      return;
    }
  }

  const conversa = await obterOuCriarConversaAberta(supabase, msg);

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

  const { error: erroInsercao } = await supabase.from("whatsapp_mensagens").insert({
    conversa_id: conversa.id,
    direcao: "entrada",
    tipo: msg.tipo,
    conteudo: msg.conteudo,
    whatsapp_message_id: msg.idExterno,
    status_entrega: "entregue",
    url_midia: urlMidia,
  });
  if (erroInsercao) {
    // 23505 = a mesma mensagem acabou de ser gravada por um retry
    // simultâneo (índice único da fase269) — não é erro, só não repete.
    if (erroInsercao.code === "23505") return;
    // Antes este erro era ignorado: a conversa "recebia" mensagem que não
    // existia no histórico e a automação/IA rodava mesmo assim.
    throw new Error(`Não foi possível gravar a mensagem recebida: ${erroInsercao.message}`);
  }

  await incrementarNaoLidas(supabase, conversa.id, conversa.nao_lidas ?? 0);

  // Pedido de não contato ("pare", "não me mande mais"): marca a conversa,
  // pausa a IA e encerra a sequência de follow-up. Não responde automaticamente.
  if (msg.tipo === "texto" && detectarPedidoNaoContato(msg.conteudo)) {
    const { error: erroOptOut } = await supabase
      .from("whatsapp_conversas")
      .update({ nao_contatar: true, nao_contatar_em: new Date().toISOString(), ia_pausada: true })
      .eq("id", conversa.id);
    if (erroOptOut) {
      // Coluna pode não existir se a migration fase264 ainda não foi aplicada: pausa a IA mesmo assim.
      console.error("Não foi possível registrar nao_contatar (aplicar fase264?):", erroOptOut.message);
      await supabase.from("whatsapp_conversas").update({ ia_pausada: true }).eq("id", conversa.id);
    }
    if (conversa.card_id) {
      await supabase.from("crm_cards").update({ status_recuperacao: "sem_retorno", proxima_acao: "Cliente pediu para não ser contatado" }).eq("id", conversa.card_id);
    }
    await registrarLog({ direcao: "entrada", evento: "pedido_nao_contato", payload: { conversaId: conversa.id }, sucesso: true });
    try {
      await processarAutomacaoNovaMensagem({ telefone: msg.telefone, nomeContato: msg.nomeContato, conversaId: conversa.id });
    } catch (err) {
      console.error("Falha na automação de nova mensagem:", err);
    }
    return; // sem resposta automática da IA
  }

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

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Conversa aberta do telefone, ou uma nova. Robusta a duplicatas antigas:
 * antes, com 2 conversas abertas para o mesmo número, `.maybeSingle()`
 * devolvia erro (ignorado) e `data = null` — e CADA mensagem nova criava
 * mais uma conversa. Agora pega a mais recente e, se outra chamada criou a
 * conversa no meio do caminho (índice único da fase269), reaproveita a dela.
 */
async function obterOuCriarConversaAberta(supabase: AdminClient, msg: MensagemRecebidaNormalizada): Promise<WhatsappConversa> {
  const buscarAberta = async () => {
    const { data, error } = await supabase
      .from("whatsapp_conversas")
      .select("*")
      .eq("telefone", msg.telefone)
      .eq("status", "aberta")
      .order("ultima_mensagem_em", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`Não foi possível buscar a conversa: ${error.message}`);
    return data as WhatsappConversa | null;
  };

  const existente = await buscarAberta();
  if (existente) {
    if (msg.jidOriginal && existente.jid_envio !== msg.jidOriginal) {
      // Atualiza se o JID mudou (ex: WhatsApp resolveu o LID pro número
      // real numa mensagem seguinte) — não custa manter atualizado.
      await supabase.from("whatsapp_conversas").update({ jid_envio: msg.jidOriginal }).eq("id", existente.id);
    }
    return existente;
  }

  // Quem já pediu para não ser contatado continua assim em conversa nova.
  const { data: anteriorOptOut } = await supabase
    .from("whatsapp_conversas")
    .select("id")
    .eq("telefone", msg.telefone)
    .eq("nao_contatar", true)
    .limit(1)
    .maybeSingle();
  const { data: nova, error } = await supabase
    .from("whatsapp_conversas")
    .insert({
      telefone: msg.telefone, status: "aberta", jid_envio: msg.jidOriginal ?? null,
      ...(anteriorOptOut ? { nao_contatar: true, ia_pausada: true } : {}),
    })
    .select("*")
    .single();
  if (nova) return nova as WhatsappConversa;
  if (error?.code === "23505") {
    const daCorrida = await buscarAberta();
    if (daCorrida) return daCorrida;
  }
  throw new Error(`Não foi possível criar a conversa: ${error?.message}`);
}

/** Incremento atômico (RPC da fase269); cai para leitura+escrita só se a migration ainda não foi aplicada. */
async function incrementarNaoLidas(supabase: AdminClient, conversaId: string, valorLido: number): Promise<void> {
  const { error } = await supabase.rpc("incrementar_nao_lidas_conversa", { p_conversa_id: conversaId });
  if (!error) return;
  console.warn("incrementar_nao_lidas_conversa indisponível (aplicar fase269?):", error.message);
  const { error: erroFallback } = await supabase
    .from("whatsapp_conversas")
    .update({ ultima_mensagem_em: new Date().toISOString(), nao_lidas: valorLido + 1 })
    .eq("id", conversaId);
  if (erroFallback) throw new Error(`Não foi possível atualizar a conversa: ${erroFallback.message}`);
}

/** Total de conversas com mensagem não lida — usado no badge do menu lateral. */
export async function contarConversasNaoLidas(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase.from("whatsapp_conversas").select("*", { count: "exact", head: true }).gt("nao_lidas", 0);
  return count ?? 0;
}

/**
 * Conversa lida no celular/WhatsApp Web vinculado (evento `chats.update` da
 * Bridge). Zera as "não lidas" das conversas abertas desse contato — pelo
 * telefone ou pelo JID exato (contas LID). Antes isso só acontecia abrindo a
 * conversa dentro do Neotec OS, e os contadores do sistema inflavam.
 */
export async function marcarLidaPeloAparelho(input: { telefone: string; jid?: string | null }): Promise<number> {
  const supabase = createAdminClient();
  // Telefone como a Bridge grava (dígitos; conversas antigas podem ter o
  // sufixo de aparelho ":0") — e também sem o sufixo, para casar as duas formas.
  const bruto = input.telefone.replace(/[^\d:]/g, "");
  const semSufixo = bruto.split(":")[0];
  const filtros = [...new Set([bruto, semSufixo])].filter(Boolean).map((t) => `telefone.eq.${t}`);
  if (input.jid && /^[\w.:@-]+$/.test(input.jid)) filtros.push(`jid_envio.eq.${input.jid}`);
  const { data, error } = await supabase
    .from("whatsapp_conversas")
    .update({ nao_lidas: 0 })
    .eq("status", "aberta")
    .gt("nao_lidas", 0)
    .or(filtros.join(","))
    .select("id");
  if (error) throw new Error(`Não foi possível marcar a conversa como lida: ${error.message}`);
  return data?.length ?? 0;
}
