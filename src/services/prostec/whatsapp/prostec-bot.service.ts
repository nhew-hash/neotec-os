import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveAIProvider } from "@/services/ia/providers/ia-provider-resolver";
import { enviarMensagemProstec } from "./prostec-whatsapp.provider";

/**
 * IARA — agente comercial de IA da Prostec. Substitui o bot scripted
 * anterior (Fase 201) por uma conversa de verdade, com memória
 * persistente, decisão comercial, e limites rígidos (nunca inventa
 * preço/desconto/prazo — só o que está em prostec_oferta).
 *
 * Regra de propriedade da conversa: só quem é "dono" (ai/human) pode
 * responder. "paused" nunca gera resposta automática — evita duas
 * respostas simultâneas (Iara + operador).
 */

const LIMITE_MENSAGENS_POR_HORA = 20; // trava de segurança — muitas mensagens seguidas geralmente indica erro de loop, não conversa real

interface DecisaoIara {
  resposta: string;
  intent: string;
  novo_status_lead: string | null;
  motivo_perda: string | null;
  nova_temperatura: "quente" | "morno" | "frio" | null;
  objecao: string | null;
  proxima_acao: string;
  pedido_fora_limite: boolean;
  exige_atencao_humana: boolean;
  motivo_atencao: string | null;
  gerar_proposta: boolean;
  nao_contatar: boolean;
}

const STATUS_VALIDOS = ["novo", "contato_realizado", "qualificado", "reuniao", "proposta_enviada", "negociacao", "venda_fechada", "perdido"];

function montarPromptSistema(oferta: { produto: string; preco: number; formas_pagamento: string; prazo_entrega: string; incluso: string; nao_incluso: string; desconto_maximo_automatico_pct: number; parcelamento_maximo: number }): string {
  return `Você é a Iara, consultora comercial da Neotec — vende sites profissionais pra empresas locais.

PERSONALIDADE: humana, profissional, natural. Mensagens curtas (WhatsApp, não e-mail). Uma pergunta por vez. Nunca insiste demais. Se perguntarem se você é IA, responde com honestidade, sem fingir ser humana.

OFERTA (única fonte de verdade — NUNCA afirme preço, desconto, prazo ou condição fora disso):
- Produto: ${oferta.produto}
- Preço: R$ ${oferta.preco}
- Pagamento: ${oferta.formas_pagamento}
- Prazo de entrega: ${oferta.prazo_entrega}
- Incluso: ${oferta.incluso}
- Não incluso: ${oferta.nao_incluso}
- Desconto máximo que você pode oferecer sozinha: ${oferta.desconto_maximo_automatico_pct}%
- Parcelamento máximo: ${oferta.parcelamento_maximo}x

REGRAS RÍGIDAS:
- NUNCA invente preço, desconto, prazo, garantia, funcionalidade, resultado ou cliente que não estejam listados acima.
- Se o cliente pedir desconto/condição ACIMA do limite, ou algo que você não tem informação pra responder com segurança: marque pedido_fora_limite=true e exige_atencao_humana=true, e responda de forma natural que vai verificar com o time (sem prometer nada específico).
- Se o cliente pedir pra não receber mais mensagens: marque nao_contatar=true, responda educadamente confirmando, e não tente mais vender.
- Nunca finja ser humana se perguntarem diretamente.

Responda SEMPRE em JSON válido, sem texto fora do JSON, neste formato exato:
{
  "resposta": "texto que a Iara vai mandar pro cliente",
  "intent": "uma palavra/frase curta descrevendo a intenção do cliente nessa mensagem",
  "novo_status_lead": "um destes: ${STATUS_VALIDOS.join(" | ")} — ou null se não deve mudar",
  "motivo_perda": "motivo se novo_status_lead for perdido, senão null",
  "nova_temperatura": "quente | morno | frio | null",
  "objecao": "objeção identificada nessa mensagem, ou null",
  "proxima_acao": "o que fazer a seguir, resumido",
  "pedido_fora_limite": true ou false,
  "exige_atencao_humana": true ou false,
  "motivo_atencao": "motivo se exige_atencao_humana, senão null",
  "gerar_proposta": true ou false (true só se o cliente pediu explicitamente a proposta/orçamento por escrito),
  "nao_contatar": true ou false
}`;
}

async function decidirProximaAcao(contexto: {
  empresa: string; segmento: string; cidade: string; score: number; temperatura: string;
  possuiSite: boolean; motivoOportunidade: string; etapaAtual: string; resumoContexto: string | null;
  historico: { remetente: string; conteudo: string }[]; mensagemNova: string;
}): Promise<DecisaoIara | null> {
  const admin = createAdminClient();
  const { data: oferta } = await admin.from("prostec_oferta").select("*").eq("id", "default").maybeSingle();
  if (!oferta) return null;

  const historicoTexto = contexto.historico.slice(-12).map((m) => `${m.remetente === "lead" ? "Cliente" : "Iara"}: ${m.conteudo}`).join("\n");

  const promptUsuario = `CONTEXTO DO LEAD:
Empresa: ${contexto.empresa}
Segmento: ${contexto.segmento}
Cidade: ${contexto.cidade}
Score: ${contexto.score}
Temperatura: ${contexto.temperatura}
Site: ${contexto.possuiSite ? "Possui" : "Não possui"}
Oportunidade identificada: ${contexto.motivoOportunidade}
Etapa atual no CRM: ${contexto.etapaAtual}
${contexto.resumoContexto ? `Resumo do que já foi conversado: ${contexto.resumoContexto}` : ""}

HISTÓRICO RECENTE DA CONVERSA:
${historicoTexto || "(início da conversa)"}

NOVA MENSAGEM DO CLIENTE:
"${contexto.mensagemNova}"

Decida a resposta e a atualização de CRM, seguindo o formato JSON exato definido no system prompt.`;

  try {
    const { provider } = await getActiveAIProvider();
    const resultado = await provider.completar({
      sistema: montarPromptSistema(oferta),
      prompt: promptUsuario,
      formatoJson: true,
      temperatura: 0.4,
      maxTokens: 600,
    });

    const decisao = JSON.parse(resultado.texto.replace(/```json|```/g, "").trim()) as DecisaoIara;
    return decisao;
  } catch {
    return null; // se a IA falhar, nunca inventa decisão — quem chama trata como "precisa de atenção humana"
  }
}

async function podeEnviarMensagemReal(): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin.from("integracoes_whatsapp_prostec").select("modo_operacao, iara_ativa").maybeSingle();
  if (data?.iara_ativa === false) return false;
  return data?.modo_operacao !== "teste";
}

async function registrarMensagem(conversaId: string, remetente: "lead" | "bot" | "vendedor", conteudo: string, iaGerada: boolean) {
  const admin = createAdminClient();
  await admin.from("prostec_mensagens").insert({ conversa_id: conversaId, remetente, conteudo, ia_gerada: iaGerada });
  await admin.from("prostec_conversas").update({ ultima_mensagem_em: new Date().toISOString() }).eq("id", conversaId);
}

/** Inicia a conversa — chamado quando o vendedor "manda pra Iara" um lead. */
export async function iniciarConversaBot(leadId: string, telefone: string, nomeEmpresa: string): Promise<{ sucesso: boolean; motivo?: string }> {
  const admin = createAdminClient();

  const { data: conversa, error } = await admin.from("prostec_conversas").upsert(
    { lead_id: leadId, telefone, propriedade: "ai", status: "aberta" },
    { onConflict: "telefone" }
  ).select("id").single();
  if (error) return { sucesso: false, motivo: error.message };

  const { data: lead } = await admin.from("prostec_leads").select("reasons").eq("id", leadId).maybeSingle();
  const motivoOportunidade = (lead?.reasons as string[] | null)?.[0] ?? "notei uma boa oportunidade de presença digital pra vocês";

  const texto = `Olá! Tudo bem? Falo da Neotec. Posso falar rapidamente com o responsável pela ${nomeEmpresa}? ${motivoOportunidade}.`;

  if (!(await podeEnviarMensagemReal())) {
    await registrarMensagem(conversa.id, "bot", `[MODO TESTE — não enviado de verdade] ${texto}`, true);
    return { sucesso: true };
  }

  const resultado = await enviarMensagemProstec(telefone, texto);
  if (!resultado.enviado) return { sucesso: false, motivo: resultado.motivo };

  await registrarMensagem(conversa.id, "bot", texto, true);
  await admin.from("prostec_leads").update({ status: "contato_realizado" }).eq("id", leadId);
  await admin.from("prostec_atividades").insert({ lead_id: leadId, tipo: "contato", descricao: "🤖 Iara iniciou contato via WhatsApp" });

  return { sucesso: true };
}

/** Processa uma mensagem recebida — a Iara decide, responde, atualiza CRM, registra a decisão. */
export async function processarMensagemRecebidaIara(telefone: string, textoRecebido: string): Promise<void> {
  const admin = createAdminClient();

  const { data: conversa } = await admin
    .from("prostec_conversas")
    .select("*, lead:prostec_leads(id, segment, score, temperature, status, reasons, site_analysis, company:prostec_companies(name, city))")
    .eq("telefone", telefone)
    .maybeSingle();
  if (!conversa) return; // número não é lead da Prostec — ignora

  await registrarMensagem(conversa.id, "lead", textoRecebido, false);
  await admin.from("prostec_conversas").update({ nao_lidas: conversa.nao_lidas + 1 }).eq("id", conversa.id);

  if (conversa.nao_contatar) return; // cliente pediu pra não receber mensagem — nunca mais responde automaticamente
  if (conversa.propriedade !== "ai") return; // conversa com humano ou pausada — Iara não interfere

  // Trava de segurança — muitas mensagens numa hora é sinal de loop/erro, não conversa real.
  const umaHoraAtras = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: mensagensNaUltimaHora } = await admin.from("prostec_mensagens").select("*", { count: "exact", head: true }).eq("conversa_id", conversa.id).eq("remetente", "bot").gte("enviada_em", umaHoraAtras);
  if ((mensagensNaUltimaHora ?? 0) >= LIMITE_MENSAGENS_POR_HORA) {
    await admin.from("prostec_conversas").update({ propriedade: "paused", exige_atencao: true, motivo_atencao: "Limite de mensagens por hora atingido — possível loop" }).eq("id", conversa.id);
    return;
  }

  const lead = conversa.lead as unknown as {
    id: string; segment: string; score: number; temperature: string; status: string; reasons: string[] | null;
    site_analysis: { possui_site: boolean } | null; company: { name: string; city: string } | null;
  } | null;

  const { data: historico } = await admin.from("prostec_mensagens").select("remetente, conteudo").eq("conversa_id", conversa.id).order("enviada_em", { ascending: false }).limit(20);

  const decisao = await decidirProximaAcao({
    empresa: lead?.company?.name ?? "essa empresa",
    segmento: lead?.segment ?? "não informado",
    cidade: lead?.company?.city ?? "não informada",
    score: lead?.score ?? 0,
    temperatura: lead?.temperature ?? "frio",
    possuiSite: lead?.site_analysis?.possui_site ?? false,
    motivoOportunidade: lead?.reasons?.[0] ?? "presença digital com espaço pra melhorar",
    etapaAtual: lead?.status ?? "novo",
    resumoContexto: conversa.resumo_contexto,
    historico: (historico ?? []).reverse(),
    mensagemNova: textoRecebido,
  });

  if (!decisao) {
    // IA falhou — nunca decide sozinha, escala.
    await admin.from("prostec_conversas").update({ exige_atencao: true, motivo_atencao: "Iara não conseguiu processar essa mensagem — verificar manualmente" }).eq("id", conversa.id);
    return;
  }

  await admin.from("prostec_ia_decisoes").insert({
    conversa_id: conversa.id, mensagem_recebida: textoRecebido, intent: decisao.intent,
    decisao: decisao.proxima_acao, acao: decisao.gerar_proposta ? "gerar_proposta" : "responder",
  });

  // Atualiza CRM conforme a decisão — nunca sozinha em status fora da lista permitida.
  if (lead?.id) {
    const patch: Record<string, unknown> = {};
    if (decisao.novo_status_lead && STATUS_VALIDOS.includes(decisao.novo_status_lead)) {
      patch.status = decisao.novo_status_lead;
      if (decisao.novo_status_lead === "perdido") patch.motivo_perda = decisao.motivo_perda;
    }
    if (decisao.nova_temperatura) patch.temperature = decisao.nova_temperatura;
    if (Object.keys(patch).length > 0) await admin.from("prostec_leads").update(patch).eq("id", lead.id);

    if (patch.status === "qualificado") {
      const { distribuirLeadAutomaticamente } = await import("../prostec.actions");
      await distribuirLeadAutomaticamente(lead.id);
    }
  }

  const novasObjecoes = decisao.objecao ? [...(Array.isArray(conversa.objecoes) ? conversa.objecoes : []), decisao.objecao] : conversa.objecoes;
  await admin.from("prostec_conversas").update({
    ultima_intencao: decisao.intent, proxima_acao: decisao.proxima_acao, objecoes: novasObjecoes,
    exige_atencao: decisao.exige_atencao_humana || decisao.pedido_fora_limite,
    motivo_atencao: decisao.motivo_atencao ?? (decisao.pedido_fora_limite ? "Cliente pediu condição fora do limite configurado" : null),
    nao_contatar: decisao.nao_contatar,
    propriedade: decisao.exige_atencao_humana || decisao.pedido_fora_limite ? "paused" : conversa.propriedade,
  }).eq("id", conversa.id);

  // Só manda a resposta se não precisar escalar pro humano ANTES de falar (evita a Iara prometer algo indevido).
  if (!decisao.pedido_fora_limite) {
    if (!(await podeEnviarMensagemReal())) {
      await registrarMensagem(conversa.id, "bot", `[MODO TESTE — não enviado de verdade] ${decisao.resposta}`, true);
    } else {
      const resultadoEnvio = await enviarMensagemProstec(telefone, decisao.resposta);
      if (resultadoEnvio.enviado) await registrarMensagem(conversa.id, "bot", decisao.resposta, true);
    }
  }

  if (decisao.gerar_proposta && lead?.id) {
    const { data: oferta } = await admin.from("prostec_oferta").select("*").eq("id", "default").maybeSingle();
    if (oferta) {
      const { data: proposta } = await admin.from("prostec_propostas").insert({
        lead_id: lead.id, produto: oferta.produto, valor: oferta.preco, forma_pagamento: oferta.formas_pagamento,
      }).select("token_publico").single();

      if (proposta) {
        const link = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://neotecbrasil.com"}/proposta/${proposta.token_publico}`;
        const textoProposta = `Aqui está a proposta, é só abrir o link: ${link}`;
        const envio = await enviarMensagemProstec(telefone, textoProposta);
        if (envio.enviado) await registrarMensagem(conversa.id, "bot", textoProposta, true);
        await admin.from("prostec_leads").update({ status: "proposta_enviada" }).eq("id", lead.id);
        await admin.from("prostec_atividades").insert({ lead_id: lead.id, tipo: "proposta_enviada", descricao: "📄 Iara enviou proposta automaticamente" });
      }
    }
  }
}

/** Vendedor assume a conversa manualmente — a qualquer momento. */
export async function assumirConversaProstec(conversaId: string, usuarioId: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("prostec_conversas").update({ propriedade: "human", responsavel_id: usuarioId, status: "aberta", exige_atencao: false }).eq("id", conversaId);
}

/** Devolve a conversa pra Iara — ela retoma de onde parou. */
export async function devolverConversaParaIara(conversaId: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("prostec_conversas").update({ propriedade: "ai", responsavel_id: null, exige_atencao: false, motivo_atencao: null }).eq("id", conversaId);
}
