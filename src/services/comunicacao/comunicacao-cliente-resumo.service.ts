import { createClient } from "@/lib/supabase/server";
import { obterSaldoCashback } from "@/services/cashback/cashback.service";
import type { Cliente } from "@/types";

export interface ResumoClienteAtendimento {
  cliente: Cliente | null;
  totalVendas: number;
  osAbertas: number;
  garantiasAtivas: number;
  saldoCashback: number;
  ultimaObservacao: string | null;
  etapaFunil: { nome: string; cor: string; valorEstimado: number | null } | null;
  tags: string[];
  /** Oportunidade vinculada à conversa: o que fazer a seguir. */
  oportunidade: { id: string; titulo: string; proximaAcao: string | null; objecao: string | null; entrouEtapaEm: string; perdido: boolean } | null;
  /** null = a fonte não pôde ser lida agora (a tela diz isso, em vez de mostrar "nenhum"). */
  followupsPendentes: { id: string; motivo: string; dataAgendada: string }[] | null;
  propostasAbertas: { id: string; valor: number; status: string; criadaEm: string }[] | null;
}

const STATUS_PROPOSTA_ABERTA = ["criado", "enviado", "visualizado"];

function calcularTags(cliente: Cliente, totalVendas: number, osAbertas: number): string[] {
  const tags: string[] = [];
  const diasDesdeCadastro = (Date.now() - new Date(cliente.data_cadastro).getTime()) / (1000 * 60 * 60 * 24);

  if (diasDesdeCadastro <= 7) tags.push("Novo cliente");
  else tags.push("Cliente antigo");

  if (totalVendas > 0) tags.push("Compra realizada");
  if (osAbertas > 0) tags.push("Em assistência");
  if (cliente.nivel === "vip") tags.push("VIP");

  return tags;
}

/**
 * Resumo enxuto pra lateral da tela de Comunicação — quem está
 * atendendo precisa ver rápido "esse cliente já comprou aqui? tem OS em
 * aberto? garantia ativa? em que fase do funil está?", sem abrir o
 * Cliente 360° completo em outra aba. Se quiser o histórico detalhado, o
 * link pro perfil completo continua ali.
 */
export async function obterResumoClienteAtendimento(clienteId: string | null, cardId: string | null): Promise<ResumoClienteAtendimento> {
  if (!clienteId) {
    return {
      cliente: null, totalVendas: 0, osAbertas: 0, garantiasAtivas: 0, saldoCashback: 0,
      ultimaObservacao: null, etapaFunil: null, tags: [], oportunidade: null, followupsPendentes: [], propostasAbertas: [],
    };
  }

  const supabase = await createClient();

  const [
    { data: cliente },
    { count: totalVendas },
    { count: osAbertas },
    { count: garantiasAtivas },
    saldoCashback,
    { data: card },
  ] = await Promise.all([
    supabase.from("clientes").select("*").eq("id", clienteId).maybeSingle(),
    supabase.from("vendas").select("*", { count: "exact", head: true }).eq("cliente_id", clienteId).eq("status", "concluida"),
    supabase.from("ordens_servico").select("*", { count: "exact", head: true }).eq("cliente_id", clienteId).not("status", "in", "(entregue)"),
    supabase.from("garantias").select("*", { count: "exact", head: true }).eq("cliente_id", clienteId).gte("fim", new Date().toISOString().slice(0, 10)),
    obterSaldoCashback(clienteId),
    cardId
      ? supabase.from("crm_cards").select("id, titulo, valor_estimado, proxima_acao, objecao, entrou_etapa_em, perdido, etapa:crm_etapas(nome, cor)").eq("id", cardId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  // Follow-ups do card OU direto do cliente (os dois caminhos existem desde a Fase 179).
  const [{ data: followups, error: erroFollowups }, { data: propostas, error: erroPropostas }] = await Promise.all([
    supabase
      .from("crm_followups")
      .select("id, motivo, data_agendada")
      .eq("status", "pendente")
      .or(cardId ? `cliente_id.eq.${clienteId},card_id.eq.${cardId}` : `cliente_id.eq.${clienteId}`)
      .order("data_agendada")
      .limit(3),
    supabase
      .from("orcamentos")
      .select("id, valor, status, data_criacao")
      .eq("cliente_id", clienteId)
      .in("status", STATUS_PROPOSTA_ABERTA)
      .order("data_criacao", { ascending: false })
      .limit(3),
  ]);
  if (erroFollowups) console.error("Resumo do cliente: follow-ups indisponíveis:", erroFollowups.message);
  if (erroPropostas) console.error("Resumo do cliente: propostas indisponíveis:", erroPropostas.message);

  const etapa = (card as unknown as {
    id: string; titulo: string; proxima_acao: string | null; objecao: string | null; entrou_etapa_em: string; perdido: boolean;
    etapa: { nome: string; cor: string } | null; valor_estimado: number | null;
  } | null);

  return {
    cliente,
    totalVendas: totalVendas ?? 0,
    osAbertas: osAbertas ?? 0,
    garantiasAtivas: garantiasAtivas ?? 0,
    saldoCashback,
    ultimaObservacao: null,
    etapaFunil: etapa?.etapa ? { nome: etapa.etapa.nome, cor: etapa.etapa.cor, valorEstimado: etapa.valor_estimado } : null,
    tags: cliente ? calcularTags(cliente, totalVendas ?? 0, osAbertas ?? 0) : [],
    oportunidade: etapa ? { id: etapa.id, titulo: etapa.titulo, proximaAcao: etapa.proxima_acao, objecao: etapa.objecao, entrouEtapaEm: etapa.entrou_etapa_em, perdido: etapa.perdido } : null,
    followupsPendentes: erroFollowups ? null : (followups ?? []).map((f) => ({ id: f.id, motivo: f.motivo, dataAgendada: f.data_agendada })),
    propostasAbertas: erroPropostas ? null : (propostas ?? []).map((p) => ({ id: p.id, valor: Number(p.valor ?? 0), status: p.status, criadaEm: p.data_criacao })),
  };
}
