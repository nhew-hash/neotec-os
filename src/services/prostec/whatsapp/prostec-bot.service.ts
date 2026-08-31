import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveAIProvider } from "@/services/ia/providers/ia-provider-resolver";
import { enviarMensagemProstec } from "./prostec-whatsapp.provider";

/**
 * Bot SDR da Prostec — segue o roteiro exato do documento de visão:
 * abertura → descobrir responsável → perguntar se tem site →
 * apresentar oportunidade → qualificar → passar pro vendedor.
 *
 * O bot NUNCA tenta vender sozinho (regra explícita do documento) —
 * só qualifica e entrega pronto pro humano.
 */

async function classificarResposta(pergunta: string, resposta: string): Promise<"positivo" | "negativo" | "incerto"> {
  try {
    const { provider, config } = await getActiveAIProvider();
    const resultado = await provider.completar({
      sistema: 'Você classifica respostas curtas de WhatsApp como "positivo", "negativo" ou "incerto" em relação à pergunta feita. Responda só com um JSON: {"classificacao": "positivo" | "negativo" | "incerto"}',
      prompt: `Pergunta feita: "${pergunta}"\nResposta da pessoa: "${resposta}"`,
      formatoJson: true,
      temperatura: 0,
      maxTokens: 50,
    });
    const parsed = JSON.parse(resultado.texto.replace(/```json|```/g, "").trim());
    if (parsed.classificacao === "positivo" || parsed.classificacao === "negativo") return parsed.classificacao;
    return "incerto";
  } catch {
    return "incerto"; // se a IA falhar, nunca assume — deixa pro vendedor decidir
  }
}

const MENSAGEM_ABERTURA = (nomeEmpresa: string) =>
  `Olá! Tudo bem? Falo da Neotec. Posso falar rapidamente com o responsável pela ${nomeEmpresa}?`;

const MENSAGEM_PERGUNTAR_SITE = (motivoOportunidade: string) =>
  `Perfeito! ${motivoOportunidade} Hoje vocês possuem um site próprio?`;

const MENSAGEM_APRESENTAR_SEM_SITE =
  "Entendi. Estamos entrando em contato porque ajudamos empresas locais a transformar essa presença digital em mais oportunidades de clientes. Posso te mostrar rapidamente como ficaria um site para vocês?";

const MENSAGEM_APRESENTAR_COM_SITE =
  "Entendi! Ajudamos empresas locais a modernizar o site pra converter mais visitantes em clientes de verdade. Posso te mostrar rapidamente algumas ideias pro site de vocês?";

async function registrarMensagem(conversaId: string, remetente: "lead" | "bot" | "vendedor", conteudo: string, iaGerada: boolean) {
  const admin = createAdminClient();
  await admin.from("prostec_mensagens").insert({ conversa_id: conversaId, remetente, conteudo, ia_gerada: iaGerada });
  await admin.from("prostec_conversas").update({ ultima_mensagem_em: new Date().toISOString() }).eq("id", conversaId);
}

/** Inicia a conversa — chamado quando o vendedor "manda pro bot" um lead. Envia a primeira mensagem e cria a conversa. */
export async function iniciarConversaBot(leadId: string, telefone: string, nomeEmpresa: string): Promise<{ sucesso: boolean; motivo?: string }> {
  const admin = createAdminClient();

  const { data: conversa, error } = await admin.from("prostec_conversas").upsert(
    { lead_id: leadId, telefone, etapa_bot: "descobrir_responsavel", bot_ativo: true, status: "aberta" },
    { onConflict: "telefone" }
  ).select("id").single();
  if (error) return { sucesso: false, motivo: error.message };

  const texto = MENSAGEM_ABERTURA(nomeEmpresa);
  const resultado = await enviarMensagemProstec(telefone, texto);
  if (!resultado.enviado) return { sucesso: false, motivo: resultado.motivo };

  await registrarMensagem(conversa.id, "bot", texto, true);
  await admin.from("prostec_leads").update({ status: "contato_realizado" }).eq("id", leadId);
  await admin.from("prostec_atividades").insert({ lead_id: leadId, tipo: "contato", descricao: "🤖 Bot iniciou contato via WhatsApp" });

  return { sucesso: true };
}

/** Processa uma mensagem recebida do lead — avança a máquina de estados, responde, e faz handoff quando qualificado. */
export async function processarMensagemRecebidaBot(telefone: string, textoRecebido: string): Promise<void> {
  const admin = createAdminClient();

  const { data: conversa } = await admin.from("prostec_conversas").select("*, lead:prostec_leads(id, reasons, company:prostec_companies(name))").eq("telefone", telefone).maybeSingle();
  if (!conversa) return; // mensagem de número não cadastrado como lead — ignora, não é conversa da Prostec

  await registrarMensagem(conversa.id, "lead", textoRecebido, false);
  await admin.from("prostec_conversas").update({ nao_lidas: conversa.nao_lidas + 1 }).eq("id", conversa.id);

  if (!conversa.bot_ativo) return; // já foi passado pro vendedor — bot não responde mais

  const lead = conversa.lead as unknown as { id: string; reasons: string[] | null; company: { name: string } | null } | null;

  if (conversa.etapa_bot === "descobrir_responsavel") {
    const classificacao = await classificarResposta("Posso falar com o responsável?", textoRecebido);
    if (classificacao === "negativo") {
      await admin.from("prostec_conversas").update({ status: "encerrada", bot_ativo: false }).eq("id", conversa.id);
      return;
    }
    const motivoOportunidade = lead?.reasons?.[0] ?? "Vi a empresa de vocês e notei uma boa oportunidade de presença digital.";
    const texto = MENSAGEM_PERGUNTAR_SITE(motivoOportunidade);
    const resultado = await enviarMensagemProstec(telefone, texto);
    if (resultado.enviado) {
      await registrarMensagem(conversa.id, "bot", texto, true);
      await admin.from("prostec_conversas").update({ etapa_bot: "perguntar_site" }).eq("id", conversa.id);
    }
    return;
  }

  if (conversa.etapa_bot === "perguntar_site") {
    const classificacao = await classificarResposta("Vocês possuem um site próprio?", textoRecebido);
    const texto = classificacao === "positivo" ? MENSAGEM_APRESENTAR_COM_SITE : MENSAGEM_APRESENTAR_SEM_SITE;
    const resultado = await enviarMensagemProstec(telefone, texto);
    if (resultado.enviado) {
      await registrarMensagem(conversa.id, "bot", texto, true);
      await admin.from("prostec_conversas").update({ etapa_bot: "apresentar_oportunidade" }).eq("id", conversa.id);
    }
    return;
  }

  if (conversa.etapa_bot === "apresentar_oportunidade") {
    const classificacao = await classificarResposta("Posso te mostrar rapidamente como ficaria um site pra vocês?", textoRecebido);

    if (classificacao === "positivo") {
      // QUALIFICADO — handoff pro vendedor, bot nunca tenta vender sozinho (regra do documento).
      await admin.from("prostec_conversas").update({ etapa_bot: "qualificado", bot_ativo: false, status: "aguardando" }).eq("id", conversa.id);
      if (lead?.id) {
        await admin.from("prostec_leads").update({ status: "qualificado", temperature: "quente" }).eq("id", lead.id);
        await admin.from("prostec_atividades").insert({ lead_id: lead.id, tipo: "contato", descricao: "🔥 Lead qualificado pelo bot — aguardando vendedor assumir" });
      }
      const texto = "Perfeito! Já vou te conectar com nosso time por aqui mesmo, só um instante 🙂";
      const resultado = await enviarMensagemProstec(telefone, texto);
      if (resultado.enviado) await registrarMensagem(conversa.id, "bot", texto, true);
    } else if (classificacao === "negativo") {
      await admin.from("prostec_conversas").update({ status: "encerrada", bot_ativo: false }).eq("id", conversa.id);
      if (lead?.id) await admin.from("prostec_leads").update({ status: "perdido", motivo_perda: "Sem interesse" }).eq("id", lead.id);
    }
    // "incerto" — não faz nada, deixa o vendedor ver a conversa e decidir (não força handoff nem encerra sozinho).
    return;
  }
}

/** Assumir manualmente — vendedor pode pegar a conversa a qualquer momento, mesmo com o bot ainda ativo. */
export async function assumirConversaProstec(conversaId: string, usuarioId: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("prostec_conversas").update({ bot_ativo: false, responsavel_id: usuarioId, status: "aberta" }).eq("id", conversaId);
}
