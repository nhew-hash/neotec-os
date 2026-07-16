import { createAdminClient } from "@/lib/supabase/admin";
import { paraFormatoLocalBR } from "@/utils/telefone";

/**
 * Automação da Central de Comunicação:
 * Nova mensagem → Criar Lead → Relacionar cliente → Criar CRM → Follow-up
 *
 * Usa Service Role porque é acionada pelo webhook da Meta.
 */
export async function processarAutomacaoNovaMensagem(params: {
  telefone: string;
  nomeContato?: string;
  conversaId: string;
}): Promise<{ clienteId: string; cardId: string }> {
  const supabase = createAdminClient();

  // Mensagem chega com o telefone completo (com "55", tanto da Meta
  // quanto do WhatsApp Web) — mas clientes.whatsapp nunca tem o "55".
  // Sem normalizar aqui, nunca casava com cliente já cadastrado.
  const telefoneLocal = paraFormatoLocalBR(params.telefone);

  // 1) Buscar cliente pelo WhatsApp
  const { data: clienteExistente } = await supabase
    .from("clientes")
    .select("id")
    .eq("whatsapp", telefoneLocal)
    .maybeSingle();

  let clienteId: string | undefined = clienteExistente?.id;

  // Criar cliente caso não exista
  if (!clienteId) {
    const { data: novoCliente, error: erroCliente } = await supabase
      .from("clientes")
      .insert({
        nome: params.nomeContato || `Contato ${telefoneLocal}`,
        whatsapp: telefoneLocal,
      })
      .select("id")
      .single();

    if (erroCliente || !novoCliente) {
      throw new Error(
        `Não foi possível criar o cliente automaticamente: ${erroCliente?.message}`
      );
    }

    clienteId = novoCliente.id;
  }

  // Garantia para o TypeScript
  if (!clienteId) {
    throw new Error("Cliente não encontrado ou não criado");
  }

  // Relacionar conversa ao cliente
  await supabase
    .from("whatsapp_conversas")
    .update({
      cliente_id: clienteId,
    })
    .eq("id", params.conversaId);


  // 2) Buscar card existente no CRM
  const { data: cardExistente } = await supabase
    .from("crm_cards")
    .select("id")
    .eq("cliente_id", clienteId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let cardId: string | undefined = cardExistente?.id;


  // Criar card caso não exista
  if (!cardId) {
    const { data: etapaLead } = await supabase
      .from("crm_etapas")
      .select("id")
      .eq("nome", "Lead")
      .order("ordem")
      .limit(1)
      .maybeSingle();

    if (!etapaLead) {
      throw new Error("Etapa 'Lead' não encontrada no CRM");
    }


    const { data: novoCard, error: erroCard } = await supabase
      .from("crm_cards")
      .insert({
        cliente_id: clienteId,
        etapa_id: etapaLead.id,
        titulo: `Contato via WhatsApp — ${
          params.nomeContato || telefoneLocal
        }`,
      })
      .select("id")
      .single();


    if (erroCard || !novoCard) {
      throw new Error(
        `Não foi possível criar card CRM: ${erroCard?.message}`
      );
    }

    cardId = novoCard.id;
  }


  // Garantia final
  if (!cardId) {
    throw new Error("Card CRM não encontrado ou não criado");
  }


  // Relacionar conversa ao CRM
  await supabase
    .from("whatsapp_conversas")
    .update({
      card_id: cardId,
    })
    .eq("id", params.conversaId);


  // 3) Criar follow-up automático
  const dataFollowup = new Date();
  dataFollowup.setHours(dataFollowup.getHours() + 24);


  await supabase
    .from("crm_followups")
    .insert({
      card_id: cardId,
      data_agendada: dataFollowup.toISOString(),
      motivo: "Responder novo contato recebido pelo WhatsApp",
    });


  return {
    clienteId,
    cardId,
  };
}