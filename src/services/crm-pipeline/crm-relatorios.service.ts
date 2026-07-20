import { createClient } from "@/lib/supabase/server";

export interface RelatorioCRM {
  totalLeads: number;
  taxaConversao: number;
  tempoMedioFechamentoDias: number | null;
  motivosPerda: { motivo: string; quantidade: number }[];
  clientesRecuperadosPelaIA: number;
  cardsSemRetorno: number;
}

export async function obterRelatorioCRM(): Promise<RelatorioCRM> {
  const supabase = await createClient();

  const { data: cards } = await supabase
    .from("crm_cards")
    .select("id, cliente_id, created_at, perdido, motivo_perda, status_recuperacao");

  const totalLeads = cards?.length ?? 0;
  if (totalLeads === 0) {
    return { totalLeads: 0, taxaConversao: 0, tempoMedioFechamentoDias: null, motivosPerda: [], clientesRecuperadosPelaIA: 0, cardsSemRetorno: 0 };
  }

  const clienteIds = Array.from(new Set((cards ?? []).map((c) => c.cliente_id)));
  const { data: vendas } = await supabase
    .from("vendas")
    .select("cliente_id, data_venda")
    .eq("status", "concluida")
    .in("cliente_id", clienteIds);

  const primeiraVendaPorCliente = new Map<string, string>();
  (vendas ?? []).forEach((v) => {
    if (!v.cliente_id) return;
    const atual = primeiraVendaPorCliente.get(v.cliente_id);
    if (!atual || v.data_venda < atual) primeiraVendaPorCliente.set(v.cliente_id, v.data_venda);
  });

  const cardsConvertidos = (cards ?? []).filter((c) => primeiraVendaPorCliente.has(c.cliente_id));
  const taxaConversao = totalLeads > 0 ? (cardsConvertidos.length / totalLeads) * 100 : 0;

  const temposFechamento = cardsConvertidos
    .map((c) => {
      const dataVenda = primeiraVendaPorCliente.get(c.cliente_id);
      if (!dataVenda) return null;
      const dias = (new Date(dataVenda).getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24);
      return dias >= 0 ? dias : null;
    })
    .filter((d): d is number => d !== null);

  const tempoMedioFechamentoDias = temposFechamento.length > 0
    ? temposFechamento.reduce((a, b) => a + b, 0) / temposFechamento.length
    : null;

  const contagemMotivos = new Map<string, number>();
  (cards ?? []).filter((c) => c.perdido && c.motivo_perda).forEach((c) => {
    const motivo = c.motivo_perda!;
    contagemMotivos.set(motivo, (contagemMotivos.get(motivo) ?? 0) + 1);
  });

  return {
    totalLeads,
    taxaConversao,
    tempoMedioFechamentoDias,
    motivosPerda: Array.from(contagemMotivos.entries())
      .map(([motivo, quantidade]) => ({ motivo, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade),
    clientesRecuperadosPelaIA: (cards ?? []).filter((c) => c.status_recuperacao === "recuperado").length,
    cardsSemRetorno: (cards ?? []).filter((c) => c.status_recuperacao === "sem_retorno").length,
  };
}
