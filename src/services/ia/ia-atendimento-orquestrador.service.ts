import { createAdminClient } from "@/lib/supabase/admin";
import { gerarRespostaAtendimento } from "./ia-atendimento.service";
import { enviarMensagemIA, enviarFotoCatalogo } from "@/services/whatsapp/whatsapp.service";
import { aplicarSinaisScore } from "@/services/crm-pipeline/crm-score.service";
import { buscarFotosCatalogo, urlPublicaFotoCatalogo } from "@/services/catalogo-fotos/catalogo-fotos.service";
import { perguntarParaEquipe } from "./ia-pergunta-equipe.service";
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
  if (resposta.querHumano) {
    // Cliente pediu humano DE VERDADE — não é caso de "IA pergunta e
    // continua", é handoff completo mesmo.
    await enviarMensagemIA({ conversaId: conversa.id, telefone: conversa.telefone, texto: resposta.resposta, jidEnvio: conversa.jid_envio });
    await pausarEEscalar(conversa, "Cliente pediu atendimento humano");
  } else if (resposta.confiancaBaixa) {
    const { data: configuracao2 } = await supabase.from("configuracoes_ia").select("numero_vendedor_perguntas").maybeSingle();

    if (configuracao2?.numero_vendedor_perguntas) {
      // Em vez de só pausar e criar follow-up, manda a pergunta direto
      // pro WhatsApp do vendedor — ele responde, a IA usa a resposta e
      // continua atendendo, sem precisar abrir o sistema. Cliente
      // recebe um aviso curto nesse meio tempo, pra não parecer que o
      // atendimento simplesmente parou.
      await enviarMensagemIA({
        conversaId: conversa.id, telefone: conversa.telefone,
        texto: "Só um momento, vou confirmar essa informação e já te retorno! 😊",
        jidEnvio: conversa.jid_envio,
      });
      await supabase.from("whatsapp_conversas").update({ ia_pausada: true }).eq("id", conversa.id);
      await perguntarParaEquipe({
        conversaClienteId: conversa.id,
        cardId: conversa.card_id,
        numeroVendedor: configuracao2.numero_vendedor_perguntas,
        pergunta: `Cliente perguntou: "${mensagemCliente}" — não sei responder isso. Pode me ajudar?`,
      });
    } else {
      // Sem número configurado — comportamento antigo (pausa + follow-up).
      await enviarMensagemIA({ conversaId: conversa.id, telefone: conversa.telefone, texto: resposta.resposta, jidEnvio: conversa.jid_envio });
      await pausarEEscalar(conversa, "IA não teve confiança pra responder sozinha");
    }
  } else {
    await enviarMensagemIA({ conversaId: conversa.id, telefone: conversa.telefone, texto: resposta.resposta, jidEnvio: conversa.jid_envio });

    if (resposta.fotoSolicitada) {
      await tentarEnviarFotoCatalogo(conversa, resposta.fotoSolicitada);
    }

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

    // Avança o card pra próxima etapa quando detecta engajamento real —
    // sem isso, o card fica preso na etapa inicial pra sempre, mesmo com
    // toda a inteligência de score/temperatura rodando por baixo. Só
    // avança UMA vez, saindo da etapa mais inicial (menor "ordem") — o
    // resto do funil continua sendo movido manualmente pela equipe.
    const houveEngajamento = resposta.sinaisDetectados.length > 0 || resposta.temperatura !== "frio";
    if (houveEngajamento) {
      await avancarEtapaSeInicial(conversa.card_id);
    }
  }
}

/**
 * Move o card pra próxima etapa (menor "ordem" logo acima da atual) —
 * só se ele ainda estiver na etapa MAIS inicial do funil daquela loja.
 * Não mexe em cards que já foram movidos manualmente pra qualquer outra
 * etapa — a automação só destrava o primeiro passo, o resto é decisão
 * de quem está atendendo.
 */
async function avancarEtapaSeInicial(cardId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: card } = await supabase.from("crm_cards").select("etapa_id, loja_id").eq("id", cardId).maybeSingle();
  if (!card) return;

  const { data: etapas } = await supabase
    .from("crm_etapas")
    .select("id, ordem")
    .eq("loja_id", card.loja_id)
    .eq("ativa", true)
    .order("ordem", { ascending: true });

  if (!etapas || etapas.length < 2) return;

  const etapaInicial = etapas[0];
  const proximaEtapa = etapas[1];

  if (card.etapa_id !== etapaInicial.id) return; // já saiu da etapa inicial, não mexe mais

  await supabase
    .from("crm_cards")
    .update({ etapa_id: proximaEtapa.id, entrou_etapa_em: new Date().toISOString() })
    .eq("id", cardId);
}

/**
 * Busca no catálogo pelo termo que a IA pediu e manda a primeira foto
 * encontrada. Se não achar nada, não faz nada (não avisa o cliente que
 * "não achou foto" — só segue sem foto, silenciosamente; a resposta em
 * texto já foi mandada de qualquer forma).
 */
async function tentarEnviarFotoCatalogo(conversa: WhatsappConversa, termoBusca: string): Promise<void> {
  try {
    const fotos = await buscarFotosCatalogo(termoBusca);
    if (fotos.length === 0) return;

    const urlFoto = urlPublicaFotoCatalogo(fotos[0].caminho_storage);
    await enviarFotoCatalogo({ conversaId: conversa.id, telefone: conversa.telefone, urlFoto });
  } catch (err) {
    console.error("Falha ao enviar foto do catálogo pela IA:", err);
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
