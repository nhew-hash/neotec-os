import { createAdminClient } from "@/lib/supabase/admin";
import { gerarRespostaAtendimento } from "./ia-atendimento.service";
import { enviarMensagemIA } from "@/services/whatsapp/whatsapp.service";
import { aplicarSinaisScore } from "@/services/crm-pipeline/crm-score.service";
import type { WhatsappConversa } from "@/types";

/**
 * Chamado depois que uma mensagem de cliente é gravada e a automação de
 * CRM (lead/card) já rodou. Decide se a IA responde sozinha ou escala
 * pra humano — nunca as duas coisas.
 *
 * Roda com Service Role Key (mesmo contexto de `processarAutomacaoNovaMensagem`
 * — acionado pelo webhook, sem sessão de usuário).
 */
export async function processarRespostaIA(conversa: WhatsappConversa, mensagemCliente: string): Promise<void> {
  const supabase = createAdminClient();

  if (conversa.ia_pausada) return; // pausada manualmente ou por escalonamento anterior — não mexe

  const { data: configuracao } = await supabase.from("configuracoes_ia").select("*").maybeSingle();
  if (!configuracao?.ativo || !configuracao?.atendimento_automatico_ativo) return;

  const { data: historico } = await supabase
    .from("whatsapp_mensagens")
    .select("direcao, conteudo")
    .eq("conversa_id", conversa.id)
    .order("criado_em", { ascending: false })
    .limit(8);

  let resposta;
  try {
    resposta = await gerarRespostaAtendimento({
      mensagemCliente,
      historico: (historico ?? []).reverse(),
      promptNegocio: configuracao.prompt_sistema,
    });
  } catch (err) {
    // Falha ao chamar a IA (provider fora do ar, chave inválida, etc.) —
    // não trava o cliente sem resposta nenhuma pra sempre; escala.
    console.error("Falha ao gerar resposta da IA de atendimento:", err);
    await pausarEEscalar(conversa, "A IA falhou ao tentar responder (erro técnico) — verifique Configurações → IA.");
    return;
  }

  // "Quente" não pausa mais a IA de propósito (decisão do dono do
  // produto) — ela continua tentando fechar a venda sozinha. Só pausa
  // quando o cliente pede humano explicitamente, ou quando a IA não tem
  // confiança pra responder (isso é o que protege contra informação
  // falsa — nunca foi removido).
  const precisaHumano = resposta.querHumano || resposta.confiancaBaixa;

  if (precisaHumano) {
    const motivo = resposta.querHumano
      ? "Cliente pediu atendimento humano"
      : "IA não teve confiança pra responder sozinha";

    // Ainda manda a resposta de transição da IA (ex: "já te encaminho
    // com alguém") — não deixa o cliente sem nenhuma reação.
    await enviarMensagemIA({ conversaId: conversa.id, telefone: conversa.telefone, texto: resposta.resposta, jidEnvio: conversa.jid_envio });
    await pausarEEscalar(conversa, motivo);
  } else {
    await enviarMensagemIA({ conversaId: conversa.id, telefone: conversa.telefone, texto: resposta.resposta, jidEnvio: conversa.jid_envio });

    // Lead ficou quente — avisa o time (follow-up, sem urgência de
    // "abandonar tudo agora"), mas a IA continua no controle da
    // conversa até alguém apertar "Pausar" manualmente.
    if (resposta.temperatura === "quente" && conversa.card_id) {
      await sinalizarLeadQuente(conversa.card_id);
    }
  }

  // Atualiza a temperatura do cliente (campo que já existe, não é
  // conceito novo) — reflete a classificação da IA no CRM diretamente.
  if (conversa.cliente_id) {
    await supabase.from("clientes").update({ temperatura: resposta.temperatura }).eq("id", conversa.cliente_id);
  }

  // Card do CRM: score, objeção, resumo, próxima ação. O reset da
  // sequência de follow-up (cliente respondeu → sai de "sem_retorno")
  // já é feito em `processarAutomacaoNovaMensagem`, que roda ANTES
  // disso e de forma incondicional (funciona mesmo com a IA desligada).
  if (conversa.card_id) {
    if (resposta.sinaisDetectados.length > 0) {
      await aplicarSinaisScore(conversa.card_id, resposta.sinaisDetectados);
    }

    await supabase
      .from("crm_cards")
      .update({
        objecao: resposta.objecao,
        resumo_ia: resposta.resumo,
        proxima_acao: resposta.proximaAcao,
      })
      .eq("id", conversa.card_id);
  }
}

async function pausarEEscalar(conversa: WhatsappConversa, motivo: string): Promise<void> {
  const supabase = createAdminClient();

  await supabase.from("whatsapp_conversas").update({ ia_pausada: true }).eq("id", conversa.id);

  if (conversa.card_id) {
    const dataAgendada = new Date();
    dataAgendada.setMinutes(dataAgendada.getMinutes() + 15); // urgente — 15 min, não o padrão de 24h da automação normal
    await supabase.from("crm_followups").insert({
      card_id: conversa.card_id,
      data_agendada: dataAgendada.toISOString(),
      motivo: `🤖 IA escalou: ${motivo}`,
    });
  }
}

/**
 * Lead ficou quente — não pausa a IA (ela continua tentando fechar
 * sozinha), só avisa o time via follow-up informativo. Diferente de
 * `pausarEEscalar`: não mexe em `ia_pausada`, e o prazo é mais folgado
 * (1h, não 15min) — é "fica de olho", não "abandona tudo agora".
 */
async function sinalizarLeadQuente(cardId: string): Promise<void> {
  const supabase = createAdminClient();
  const dataAgendada = new Date();
  dataAgendada.setHours(dataAgendada.getHours() + 1);
  await supabase.from("crm_followups").insert({
    card_id: cardId,
    data_agendada: dataAgendada.toISOString(),
    motivo: "🔥 Lead ficou quente — IA continua atendendo, mas vale acompanhar",
  });
}
