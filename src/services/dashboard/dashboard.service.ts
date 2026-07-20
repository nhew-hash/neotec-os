import { createClient } from "@/lib/supabase/server";
import { listarProximosAniversarios } from "@/services/clientes/clientes.service";
import { calcularResumo } from "@/services/financeiro/financeiro.service";
import type { Cliente } from "@/types";

export interface ResumoOperacional {
  clientesTotal: number;
  clientesNovosHoje: number;
  retornosHoje: number;
  aparelhosDisponiveis: number;
  osEmAndamento: number;
  osAguardandoAprovacao: number;
  osAtrasadas: number;
  entregasHoje: number;
  estoqueBaixoQtd: number;
  pendenciasQtd: number;
  vendasHoje: number;
  faturamentoHoje: number;
  financeiroSaldoHoje: number;
  aniversariantes: Cliente[];
  comunicacao: ResumoComunicacao;
}

export interface ResumoComunicacao {
  mensagensHoje: number;
  conversasAbertas: number;
  semResposta: number;
  novosLeads: number;
  tempoMedioRespostaMin: number | null;
}

async function obterResumoComunicacao(): Promise<ResumoComunicacao> {
  const supabase = await createClient();
  const hojeInicio = new Date();
  hojeInicio.setHours(0, 0, 0, 0);

  const [
    { count: mensagensHoje },
    { count: conversasAbertas },
    { count: semResposta },
    { count: novosLeads },
    { data: conversasComResposta },
  ] = await Promise.all([
    supabase.from("whatsapp_mensagens").select("*", { count: "exact", head: true }).gte("criado_em", hojeInicio.toISOString()),
    supabase.from("whatsapp_conversas").select("*", { count: "exact", head: true }).eq("status", "aberta"),
    supabase.from("whatsapp_conversas").select("*", { count: "exact", head: true }).eq("status", "aberta").gt("nao_lidas", 0),
    supabase.from("crm_cards").select("*, etapa:crm_etapas!inner(nome)", { count: "exact", head: true }).eq("crm_etapas.nome", "Lead"),
    supabase.from("whatsapp_conversas").select("created_at, primeira_resposta_em").not("primeira_resposta_em", "is", null).gte("created_at", hojeInicio.toISOString()),
  ]);

  const temposResposta = (conversasComResposta ?? [])
    .map((c) => (new Date(c.primeira_resposta_em!).getTime() - new Date(c.created_at).getTime()) / 60000)
    .filter((min) => min >= 0);
  const tempoMedioRespostaMin = temposResposta.length > 0
    ? Math.round(temposResposta.reduce((acc, v) => acc + v, 0) / temposResposta.length)
    : null;

  return {
    mensagensHoje: mensagensHoje ?? 0,
    conversasAbertas: conversasAbertas ?? 0,
    semResposta: semResposta ?? 0,
    novosLeads: novosLeads ?? 0,
    tempoMedioRespostaMin,
  };
}

const LIMITE_ESTOQUE_BAIXO = 3;

/** Números-base do dashboard, orientado às ações do dia — não é mais só contagem. */
export async function obterResumoOperacional(): Promise<ResumoOperacional> {
  const supabase = await createClient();
  const hojeInicio = new Date();
  hojeInicio.setHours(0, 0, 0, 0);
  const hojeFim = new Date(hojeInicio);
  hojeFim.setHours(23, 59, 59, 999);
  const hojeISO = hojeInicio.toISOString().slice(0, 10);

  const [
    { count: clientesTotal },
    { count: clientesNovosHoje },
    { count: retornosHoje },
    { count: aparelhosDisponiveis },
    { count: osEmAndamento },
    { count: osAguardandoAprovacao },
    { count: osAtrasadas },
    { count: entregasHoje },
    { data: saldosProdutos },
    { count: pendenciasQtd },
    { data: vendasHojeData },
    aniversariantes,
    financeiroHoje,
  ] = await Promise.all([
    supabase.from("clientes").select("*", { count: "exact", head: true }),
    supabase.from("clientes").select("*", { count: "exact", head: true }).gte("data_cadastro", hojeInicio.toISOString()),
    supabase.from("retornos").select("*", { count: "exact", head: true }).eq("status", "pendente").gte("data_retorno", hojeInicio.toISOString()),
    supabase.from("vw_aparelhos_seguro").select("*", { count: "exact", head: true }).eq("status", "disponivel"),
    supabase.from("ordens_servico").select("*", { count: "exact", head: true }).in("status", ["em_reparo", "diagnostico", "teste"]),
    supabase.from("ordens_servico").select("*", { count: "exact", head: true }).eq("status", "aguardando_aprovacao"),
    supabase.from("ordens_servico").select("*", { count: "exact", head: true }).lt("prazo", hojeISO).not("status", "in", "(entregue)"),
    supabase.from("ordens_servico").select("*", { count: "exact", head: true }).eq("prazo", hojeISO).not("status", "in", "(entregue)"),
    supabase.from("vw_produtos_saldo").select("saldo"),
    supabase.from("tarefas_pendentes").select("*", { count: "exact", head: true }).eq("status", "pendente"),
    supabase.from("vw_vendas_seguro").select("valor_total").gte("data_venda", hojeInicio.toISOString()),
    listarProximosAniversarios(7),
    calcularResumo("hoje"),
  ]);

  const vendasHoje = vendasHojeData?.length ?? 0;
  const faturamentoHoje = (vendasHojeData ?? []).reduce((acc, v) => acc + Number(v.valor_total ?? 0), 0);
  const estoqueBaixoQtd = (saldosProdutos ?? []).filter((p) => Number(p.saldo) <= LIMITE_ESTOQUE_BAIXO).length;
  const comunicacao = await obterResumoComunicacao();

  return {
    clientesTotal: clientesTotal ?? 0,
    clientesNovosHoje: clientesNovosHoje ?? 0,
    retornosHoje: retornosHoje ?? 0,
    aparelhosDisponiveis: aparelhosDisponiveis ?? 0,
    osEmAndamento: osEmAndamento ?? 0,
    osAguardandoAprovacao: osAguardandoAprovacao ?? 0,
    osAtrasadas: osAtrasadas ?? 0,
    entregasHoje: entregasHoje ?? 0,
    estoqueBaixoQtd,
    pendenciasQtd: pendenciasQtd ?? 0,
    vendasHoje,
    faturamentoHoje,
    financeiroSaldoHoje: financeiroHoje.saldo,
    aniversariantes,
    comunicacao,
  };
}
