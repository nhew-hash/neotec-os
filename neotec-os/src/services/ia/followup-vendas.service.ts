import { createAdminClient } from "@/lib/supabase/admin";
import { executarPromptIA } from "@/services/ia/ia.service";
import { enviarMensagemIA } from "@/services/whatsapp/whatsapp.service";
import { ESTAGIOS_FOLLOWUP, preencherTemplate } from "./followup-vendas-templates";

interface CardElegivel {
  id: string;
  titulo: string;
  sequencia_followup: number;
  ultima_resposta_cliente_em: string | null;
  cliente_id: string;
  cliente_nome: string;
}

async function gerarMensagemPersonalizada(template: string, nomeCliente: string, produto: string, resumoIA: string | null): Promise<string> {
  try {
    const resultado = await executarPromptIA({
      modulo: "followup_vendas",
      prompt: `Cliente: ${nomeCliente}\nProduto de interesse: ${produto}\n${resumoIA ? `Contexto da conversa: ${resumoIA}\n` : ""}\nModelo de mensagem a seguir (mantenha o tom e a ideia, pode ajustar levemente pro contexto, mas não mude o sentido nem alongue muito):\n"${template}"\n\nResponda APENAS com a mensagem final, sem aspas, sem explicação.`,
      sistema: "Você adapta mensagens curtas de follow-up de vendas pra WhatsApp, mantendo tom cordial e direto. Nunca invente informação que não está no modelo.",
      temperatura: 0.5,
    });
    return resultado.texto.trim() || preencherTemplate(template, nomeCliente, produto);
  } catch {
    // IA fora do ar — usa o template puro. Isso roda sem supervisão
    // humana, precisa sempre mandar algo mesmo se a IA falhar.
    return preencherTemplate(template, nomeCliente, produto);
  }
}

/**
 * Roda periodicamente (Vercel Cron) — verifica todo card com sequência
 * de recuperação ativa e decide se já passou tempo suficiente pra
 * disparar o próximo estágio (D+0 → D+1 → D+3 → D+5). Depois do D+5 sem
 * resposta, marca como "sem_retorno" e para de insistir, como definido.
 */
export async function processarFollowupsDeVenda(): Promise<{ processados: number; enviados: number }> {
  const supabase = createAdminClient();

  const { data: configuracao } = await supabase.from("configuracoes_ia").select("*").maybeSingle();
  if (!configuracao?.ativo || !configuracao?.atendimento_automatico_ativo) {
    return { processados: 0, enviados: 0 };
  }

  const { data: cards } = await supabase
    .from("crm_cards")
    .select("id, titulo, sequencia_followup, ultima_resposta_cliente_em, cliente_id, cliente:clientes(nome)")
    .eq("status_recuperacao", "ativo")
    .not("ultima_resposta_cliente_em", "is", null)
    .lt("sequencia_followup", 4)
    .eq("perdido", false);

  const cardsElegiveis = (cards ?? []) as unknown as (CardElegivel & { cliente: { nome: string } })[];
  let enviados = 0;

  for (const card of cardsElegiveis) {
    const proximoEstagio = ESTAGIOS_FOLLOWUP[card.sequencia_followup]; // sequencia_followup=0 → índice 0 (D+0)
    if (!proximoEstagio) continue;

    const horasDesdeResposta = (Date.now() - new Date(card.ultima_resposta_cliente_em!).getTime()) / (1000 * 60 * 60);
    if (horasDesdeResposta < proximoEstagio.horasMinimas) continue;

    // Precisa da conversa aberta e sem IA pausada — se um humano assumiu
    // a conversa, o follow-up automático não deve disparar por cima.
    const { data: conversa } = await supabase
      .from("whatsapp_conversas")
      .select("id, telefone, jid_envio, ia_pausada, card_id")
      .eq("card_id", card.id)
      .eq("ia_pausada", false)
      .maybeSingle();

    if (!conversa) continue;

    const { data: cardComResumo } = await supabase.from("crm_cards").select("resumo_ia").eq("id", card.id).maybeSingle();

    const mensagem = await gerarMensagemPersonalizada(
      proximoEstagio.template,
      card.cliente?.nome?.split(" ")[0] ?? "tudo bem",
      card.titulo,
      cardComResumo?.resumo_ia ?? null
    );

    await enviarMensagemIA({ conversaId: conversa.id, telefone: conversa.telefone, texto: mensagem, jidEnvio: conversa.jid_envio });

    await supabase
      .from("crm_cards")
      .update({
        sequencia_followup: proximoEstagio.numero,
        status_recuperacao: proximoEstagio.ehFinal ? "sem_retorno" : "ativo",
        proxima_acao: proximoEstagio.ehFinal
          ? "Sequência de recuperação encerrada — sem resposta"
          : `Aguardando resposta após follow-up ${proximoEstagio.nome}`,
      })
      .eq("id", card.id);

    enviados += 1;
  }

  return { processados: cardsElegiveis.length, enviados };
}
