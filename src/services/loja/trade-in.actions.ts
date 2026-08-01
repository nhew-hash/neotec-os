"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/types";

export async function criarTradeInAction(input: {
  nomeContato: string;
  telefoneContato: string;
  modeloAparelho: string;
  armazenamento?: string;
  condicaoRelatada?: string;
  observacoes?: string;
}): Promise<ActionResult<{ id: string }>> {
  if (!input.nomeContato.trim() || !input.telefoneContato.trim() || !input.modeloAparelho.trim()) {
    return { success: false, error: "Preencha nome, telefone e modelo do aparelho" };
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("solicitacoes_trade_in")
      .insert({
        nome_contato: input.nomeContato.trim(),
        telefone_contato: input.telefoneContato.replace(/\D/g, ""),
        modelo_aparelho: input.modeloAparelho.trim(),
        armazenamento: input.armazenamento || null,
        condicao_relatada: input.condicaoRelatada || null,
        observacoes: input.observacoes || null,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    // Avisa a equipe por WhatsApp — melhor esforço, nunca derruba a
    // submissão do trade-in se o envio falhar.
    try {
      const { data: config } = await supabase.from("configuracoes_precificacao").select("whatsapp_notificacao_staff").limit(1).maybeSingle();
      if (config?.whatsapp_notificacao_staff) {
        const { getActiveProvider } = await import("@/services/whatsapp/providers/provider-resolver");
        const { paraFormatoInternacionalBR } = await import("@/utils/telefone");
        const provider = await getActiveProvider();
        await provider.enviarTexto(
          paraFormatoInternacionalBR(config.whatsapp_notificacao_staff),
          `📲 *Novo trade-in* na loja!\n\n*Cliente:* ${input.nomeContato}\n*Telefone:* ${input.telefoneContato}\n*Aparelho:* ${input.modeloAparelho}${input.armazenamento ? ` (${input.armazenamento})` : ""}${input.condicaoRelatada ? `\n*Condição relatada:* ${input.condicaoRelatada}` : ""}`
        );
      }
    } catch (erroWhatsapp) {
      console.error("Falha ao notificar staff sobre trade-in (não bloqueia a submissão):", erroWhatsapp);
    }

    return { success: true, data: { id: data.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao enviar solicitação" };
  }
}
