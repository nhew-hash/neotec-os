import { createClient } from "@/lib/supabase/server";
import type { AutomationRegra, ModoAutonomia } from "@/types";

// ---- Regras SE/E/ENTÃO (Seção 22) ----

export async function listarRegras(): Promise<AutomationRegra[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("automation_regras").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(`Não foi possível carregar as regras: ${error.message}`);
  return data ?? [];
}

export async function criarRegra(input: { nome: string; condicoes: AutomationRegra["condicoes"]; acao: string }): Promise<AutomationRegra> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("automation_regras").insert(input).select("*").single();
  if (error) throw new Error(`Não foi possível criar a regra: ${error.message}`);
  return data;
}

export async function alternarRegra(id: string, ativa: boolean): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("automation_regras").update({ ativa }).eq("id", id);
  if (error) throw new Error(`Não foi possível alterar a regra: ${error.message}`);
}

export function avaliarCondicao(valor: number, operador: AutomationRegra["condicoes"][number]["operador"], referencia: number): boolean {
  switch (operador) {
    case ">": return valor > referencia;
    case "<": return valor < referencia;
    case ">=": return valor >= referencia;
    case "<=": return valor <= referencia;
    case "==": return valor === referencia;
  }
}

// ---- Kill switch (Seção 25) ----

export async function killSwitchAtivo(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("neo_performance_config").select("automacoes_pausadas").maybeSingle();
  return data?.automacoes_pausadas ?? true; // por padrão, trancado — nunca assume liberado na dúvida
}

export async function pararAutomacoes(): Promise<void> {
  const supabase = await createClient();
  const { data: linha } = await supabase.from("neo_performance_config").select("id").maybeSingle();
  if (!linha) throw new Error("Configuração não encontrada");
  const { error } = await supabase.from("neo_performance_config").update({ automacoes_pausadas: true, automacoes_pausadas_em: new Date().toISOString() }).eq("id", linha.id);
  if (error) throw new Error(`Não foi possível parar as automações: ${error.message}`);
}

/** Religar exige confirmação explícita do admin na UI — nunca automático. */
export async function religarAutomacoes(): Promise<void> {
  const supabase = await createClient();
  const { data: linha } = await supabase.from("neo_performance_config").select("id").maybeSingle();
  if (!linha) throw new Error("Configuração não encontrada");
  const { error } = await supabase.from("neo_performance_config").update({ automacoes_pausadas: false, automacoes_pausadas_em: null }).eq("id", linha.id);
  if (error) throw new Error(`Não foi possível religar as automações: ${error.message}`);
}

export async function pausarConta(contaId: string, motivo: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("ads_contas").update({ pausada_em: new Date().toISOString(), pausada_motivo: motivo }).eq("id", contaId);
  if (error) throw new Error(`Não foi possível pausar a conta: ${error.message}`);
}

export async function obterModoAutonomia(): Promise<ModoAutonomia> {
  const supabase = await createClient();
  const { data } = await supabase.from("neo_performance_config").select("modo_autonomia").maybeSingle();
  return data?.modo_autonomia ?? "observacao";
}

export async function definirModoAutonomia(modo: ModoAutonomia): Promise<void> {
  const supabase = await createClient();
  const { data: linha } = await supabase.from("neo_performance_config").select("id").maybeSingle();
  if (!linha) throw new Error("Configuração não encontrada");
  const { error } = await supabase.from("neo_performance_config").update({ modo_autonomia: modo }).eq("id", linha.id);
  if (error) throw new Error(`Não foi possível definir o modo: ${error.message}`);
}

/**
 * Avalia as regras ativas contra o desempenho atual das campanhas e
 * decide o que FARIA em cada uma (Seção 22). Respeita, nesta ordem:
 * 1) kill switch global; 2) modo de autonomia (Observação nunca executa,
 * só registra o que executaria); 3) limites absolutos da Seção 24.
 *
 * IMPORTANTE (Seção 57): não existe, hoje, nenhuma chamada de escrita
 * real à API do Meta/Google Ads no projeto (confirmado na auditoria da
 * Fase 1 — não há token configurado). Por isso, mesmo em MODO CONTROLADO
 * ou AUTÔNOMO, a "ação executada" aqui se limita a REGISTRAR a decisão
 * (performance_decisoes) com status 'aguardando_avaliacao' — a mudança
 * de orçamento de verdade na plataforma de anúncios só acontece quando
 * essa integração de escrita existir. Isso evita fingir uma automação
 * que não roda de verdade.
 */
export async function avaliarRegras(): Promise<{ avaliadas: number; decisoesRegistradas: number }> {
  const supabase = await createClient();
  const pausado = await killSwitchAtivo();
  const modo = await obterModoAutonomia();

  const { data: regras } = await supabase.from("automation_regras").select("*").eq("ativa", true);
  if (!regras || regras.length === 0) return { avaliadas: 0, decisoesRegistradas: 0 };

  const { obterDesempenhoPorCampanha } = await import("./financeiro-performance.service");
  const desempenho = await obterDesempenhoPorCampanha(7);

  const { registrarDecisao } = await import("./decisoes.service");
  let decisoesRegistradas = 0;

  const { avaliarConfianca } = await import("./confidence.service");

  for (const regra of regras) {
    for (const campanha of desempenho) {
      const contexto: Record<string, number> = { cac: campanha.cac ?? 0, gasto: campanha.gasto, vendas: campanha.compras, leads: campanha.leads, roas: campanha.roas ?? 0 };
      const condicoesAtendidas = (regra.condicoes as AutomationRegra["condicoes"]).every((c) => contexto[c.campo] != null && avaliarCondicao(contexto[c.campo], c.operador, c.valor));
      if (!condicoesAtendidas) continue;

      // Sistema de Confidence (Seção 48) — só propõe a ação de verdade se
      // a confiança bater o nível exigido pelo risco financeiro dela;
      // senão, registra como recomendação sem `acao` (sempre menos do
      // que o modo autorizaria, nunca mais).
      const confianca = await avaliarConfianca({ campanhaId: campanha.campanha_id, gastoNoPeriodo: campanha.gasto, amostra: campanha.compras, acao: regra.acao });
      const podeAgir = modo !== "observacao" && modo !== "recomendacao" && confianca.aprovada;

      // Observação/Recomendação nunca agem; Controlado/Autônomo só agem
      // se a confiança aprovar — e, como não há write-API real, nenhum
      // modo altera a conta de fato (fica "aguardando_avaliacao").
      await registrarDecisao({
        campanha_id: campanha.campanha_id,
        agente: "automation_engine",
        tipo_decisao: regra.nome,
        motivo: `Regra "${regra.nome}" atendida: ${JSON.stringify(regra.condicoes)}. Confiança: ${confianca.score}/${confianca.nivelExigido}${confianca.motivos.length ? " — " + confianca.motivos.join(" ") : ""}`,
        dados_utilizados: { ...contexto, confianca: confianca.score, nivelExigido: confianca.nivelExigido },
        acao: podeAgir ? regra.acao : undefined,
        resultado_esperado: pausado
          ? "Kill switch ativo — nenhuma ação real será tomada."
          : podeAgir
            ? `Ação proposta: ${regra.acao}`
            : `Confiança insuficiente (${confianca.score}/${confianca.nivelExigido}) — registrado só como recomendação.`,
      });
      decisoesRegistradas++;
    }
  }

  return { avaliadas: regras.length, decisoesRegistradas };
}
