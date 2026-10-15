import { createClient } from "@/lib/supabase/server";
import { contarCardsParados, janelaDeHoje, type CardParaAlerta, type EtapaComAlerta } from "./painel-regras";
import { conversasAguardandoResposta } from "@/services/central-comercial/central-comercial.service";
import type { CargoUsuario } from "@/types";

/**
 * Painel "Início" (redesign da auditoria 360°). Substitui os números do
 * dashboard antigo que tinham três problemas:
 *  1. "hoje" era o dia do servidor (UTC na Vercel), não o de Brasília;
 *  2. qualquer consulta que falhava aparecia como 0 (número inventado);
 *  3. faturamento somava vendas canceladas/estornadas.
 *
 * Cada indicador é carregado isoladamente: se a fonte falha, a tela mostra
 * "indisponível" naquele indicador, nunca um zero.
 */
export type Indicador = { ok: true; valor: number } | { ok: false; motivo: string };

async function contar(fn: () => PromiseLike<{ count: number | null; error: { message: string } | null }>): Promise<Indicador> {
  try {
    const { count, error } = await fn();
    if (error) return { ok: false, motivo: error.message };
    return { ok: true, valor: count ?? 0 };
  } catch (e) {
    return { ok: false, motivo: e instanceof Error ? e.message : "Indisponível" };
  }
}

const STATUS_PROPOSTA_ABERTA = ["criado", "enviado", "visualizado"];
const STATUS_OS_FINAL = "(entregue,atendimento_encerrado)";

export interface PainelDoDia {
  atencao: {
    conversasAguardando: Indicador;
    followupsAtrasados: Indicador;
    followupsHoje: Indicador;
    oportunidadesParadas: Indicador & { alertaConfigurado?: boolean };
    propostasAbertas: Indicador;
    osAtrasadas: Indicador;
  };
  hoje: {
    vendas: Indicador;
    faturamento: Indicador;
    novosContatos: Indicador;
    novosClientes: Indicador;
    osEmAndamento: Indicador;
    entregasPrevistas: Indicador;
  };
}

export async function obterPainelDoDia(cargo: CargoUsuario, usuarioId: string, agora = new Date()): Promise<PainelDoDia> {
  const supabase = await createClient();
  const { inicio, fim, data } = janelaDeHoje(agora);
  const comercial = ["admin", "gerente", "vendedor"].includes(cargo);
  const veOS = ["admin", "gerente", "tecnico"].includes(cargo);
  const naoSeAplica: Indicador = { ok: false, motivo: "não se aplica ao seu cargo" };

  const head = { count: "exact" as const, head: true };

  const oportunidadesParadas = async (): Promise<PainelDoDia["atencao"]["oportunidadesParadas"]> => {
    try {
      const [{ data: etapas, error: e1 }, { data: cards, error: e2 }] = await Promise.all([
        supabase.from("crm_etapas").select("id, dias_para_alerta").eq("ativa", true).eq("tipo", "venda"),
        supabase.from("crm_cards").select("id, etapa_id, entrou_etapa_em, perdido").eq("perdido", false),
      ]);
      if (e1 || e2) return { ok: false, motivo: (e1 ?? e2)!.message };
      const lista = (etapas ?? []) as EtapaComAlerta[];
      const alertaConfigurado = lista.some((e) => e.dias_para_alerta != null);
      return { ok: true, valor: contarCardsParados((cards ?? []) as CardParaAlerta[], lista, agora), alertaConfigurado };
    } catch (e) {
      return { ok: false, motivo: e instanceof Error ? e.message : "Indisponível" };
    }
  };

  const vendasEFaturamento = async (): Promise<[Indicador, Indicador]> => {
    try {
      const { data: vendas, error } = await supabase
        .from("vw_vendas_seguro")
        .select("valor_total")
        .eq("status", "concluida")
        .gte("data_venda", inicio)
        .lt("data_venda", fim);
      if (error) return [{ ok: false, motivo: error.message }, { ok: false, motivo: error.message }];
      const lista = vendas ?? [];
      return [
        { ok: true, valor: lista.length },
        { ok: true, valor: lista.reduce((acc, v) => acc + Number(v.valor_total ?? 0), 0) },
      ];
    } catch (e) {
      const motivo = e instanceof Error ? e.message : "Indisponível";
      return [{ ok: false, motivo }, { ok: false, motivo }];
    }
  };

  const [
    conversasAguardando, followupsAtrasados, followupsHoje, paradas, propostasAbertas, osAtrasadas,
    [vendas, faturamento], novosContatos, novosClientes, osEmAndamento, entregasPrevistas,
  ] = await Promise.all([
    // Mesma regra da Minha rotina (só conta se a ÚLTIMA mensagem é do cliente;
    // vendedora vê as dela e as sem dono) — os dois números batem.
    comercial
      ? conversasAguardandoResposta(usuarioId, cargo).then(
          (l): Indicador => ({ ok: true, valor: l.length }),
          (e): Indicador => ({ ok: false, motivo: e instanceof Error ? e.message : "Indisponível" })
        )
      : naoSeAplica,
    comercial ? contar(() => supabase.from("crm_followups").select("id", head).eq("status", "pendente").lt("data_agendada", inicio)) : naoSeAplica,
    comercial ? contar(() => supabase.from("crm_followups").select("id", head).eq("status", "pendente").gte("data_agendada", inicio).lt("data_agendada", fim)) : naoSeAplica,
    comercial ? oportunidadesParadas() : naoSeAplica,
    comercial ? contar(() => supabase.from("orcamentos").select("id", head).in("status", STATUS_PROPOSTA_ABERTA)) : naoSeAplica,
    veOS ? contar(() => supabase.from("ordens_servico").select("id", head).lt("prazo", data).not("status", "in", STATUS_OS_FINAL)) : naoSeAplica,
    cargo === "tecnico" ? Promise.resolve<[Indicador, Indicador]>([naoSeAplica, naoSeAplica]) : vendasEFaturamento(),
    comercial ? contar(() => supabase.from("whatsapp_conversas").select("id", head).gte("created_at", inicio).lt("created_at", fim)) : naoSeAplica,
    contar(() => supabase.from("clientes").select("id", head).gte("data_cadastro", inicio).lt("data_cadastro", fim)),
    veOS ? contar(() => supabase.from("ordens_servico").select("id", head).in("status", ["diagnostico", "em_reparo", "teste"])) : naoSeAplica,
    veOS ? contar(() => supabase.from("ordens_servico").select("id", head).eq("prazo", data).not("status", "in", STATUS_OS_FINAL)) : naoSeAplica,
  ]);

  return {
    atencao: { conversasAguardando, followupsAtrasados, followupsHoje, oportunidadesParadas: paradas, propostasAbertas, osAtrasadas },
    hoje: { vendas, faturamento, novosContatos, novosClientes, osEmAndamento, entregasPrevistas },
  };
}
