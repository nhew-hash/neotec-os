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

  const deveEscalar = resposta.temperatura === "quente" || resposta.querHumano || resposta.confiancaBaixa;

  if (deveEscalar) {
    const motivo = resposta.querHumano
      ? "Cliente pediu atendimento humano"
      : resposta.temperatura === "quente"
        ? "Cliente demonstrou interesse forte de fechar negócio — lead quente"
        : "IA não teve confiança pra responder sozinha";

    // Ainda manda a resposta de transição da IA (ex: "já te encaminho
    // com alguém") — não deixa o cliente sem nenhuma reação.
    await enviarMensagemIA({ conversaId: conversa.id, telefone: conversa.telefone, texto: resposta.resposta, jidEnvio: conversa.jid_envio });
    await pausarEEscalar(conversa, motivo);
  } else {
    await enviarMensagemIA({ conversaId: conversa.id, telefone: conversa.telefone, texto: resposta.resposta, jidEnvio: conversa.jid_envio });
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
