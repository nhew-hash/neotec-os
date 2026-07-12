import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Automação da Central de Comunicação — mission: "Nova mensagem → Criar
 * Lead automaticamente → Relacionar cliente → Criar follow-up →
 * Adicionar no CRM". Deliberadamente SEM IA (a missão pediu para não
 * implementar isso ainda) — é uma cadeia de regras determinísticas:
 * "se não existe cliente com esse telefone, cadastra um mínimo" /
 * "se não existe card em aberto para esse cliente, cria um na 1ª etapa".
 *
 * Roda com a Service Role Key porque é acionada pelo webhook da Meta,
 * que não tem sessão de usuário da equipe (ver app/api/whatsapp/webhook).
 */
export async function processarAutomacaoNovaMensagem(params: {
  telefone: string;
  nomeContato?: string;
  conversaId: string;
}): Promise<{ clienteId: string; cardId: string }> {
  const supabase = createAdminClient();

  // 1) Relacionar cliente — busca por telefone; cria um cadastro mínimo
  // ("Lead") se ainda não existir. A equipe completa os dados depois.
  const { data: clienteExistente } = await supabase
    .from("clientes")
    .select("id")
    .eq("whatsapp", params.telefone)
    .maybeSingle();

  let clienteId = clienteExistente?.id as string | undefined;

  if (!clienteId) {
    const { data: novoCliente, error: erroCliente } = await supabase
      .from("clientes")
      .insert({ nome: params.nomeContato || `Contato ${params.telefone}`, whatsapp: params.telefone })
      .select("id")
      .single();

    if (erroCliente || !novoCliente) {
      throw new Error(`Não foi possível criar o cliente automaticamente: ${erroCliente?.message}`);
    }
    clienteId = novoCliente.id;
  }

  // Vincula a conversa ao cliente (pode já ter sido criada sem cliente_id
  // se o telefone não era reconhecido no momento do webhook).
  await supabase.from("whatsapp_conversas").update({ cliente_id: clienteId }).eq("id", params.conversaId);

  // 2) Adicionar no CRM — se não existe card recente para esse cliente,
  // cria um na etapa "Lead".
  const { data: cardExistente } = await supabase
    .from("crm_cards")
    .select("id")
    .eq("cliente_id", clienteId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let cardId = cardExistente?.id as string | undefined;

  if (!cardId) {
    const { data: etapaLead } = await supabase
      .from("crm_etapas")
      .select("id")
      .eq("nome", "Lead")
      .order("ordem")
      .limit(1)
      .maybeSingle();

    if (!etapaLead) throw new Error("Etapa 'Lead' não encontrada no funil configurável");

    const { data: novoCard, error: erroCard } = await supabase
      .from("crm_cards")
      .insert({
        cliente_id: clienteId,
        etapa_id: etapaLead.id,
        titulo: `Contato via WhatsApp — ${params.nomeContato || params.telefone}`,
      })
      .select("id")
      .single();

    if (erroCard || !novoCard) {
      throw new Error(`Não foi possível criar o card no CRM automaticamente: ${erroCard?.message}`);
    }
    cardId = novoCard.id;
  }

  await supabase.from("whatsapp_conversas").update({ card_id: cardId }).eq("id", params.conversaId);

  // 3) Criar follow-up — lembrete padrão de 24h para alguém da equipe
  // responder, caso ninguém tenha assumido a conversa ainda.
  const dataFollowup = new Date();
  dataFollowup.setHours(dataFollowup.getHours() + 24);

  await supabase.from("crm_followups").insert({
    card_id: cardId,
    data_agendada: dataFollowup.toISOString(),
    motivo: "Responder novo contato recebido pelo WhatsApp",
  });

  return { clienteId, cardId };
}
