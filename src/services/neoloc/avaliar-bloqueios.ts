import { createClient } from "@/lib/supabase/server";
import { decidirAcaoAutomatica, gerarCommandId } from "./motor";

/**
 * Roda no mesmo cron diário que já executa `executarReguaCobranca`
 * (Crediário) — chamada DEPOIS dela, nunca no lugar. Lê o estado que o
 * Crediário já calculou (dias de atraso, status do contrato) e, só pra
 * dispositivos NeoLoc já matriculados no MDM, decide se é hora de gerar
 * um comando automático (ver `motor.ts#decidirAcaoAutomatica`).
 *
 * Continua sendo Milestone 2: o comando fica registrado com status
 * `pending` na fila (`neoloc_comandos`), pronto pra ser consumido assim
 * que a integração real com NanoMDM existir (Milestone 1/3) — esta
 * função nunca fala com um MDM de verdade.
 */
export async function avaliarBloqueiosAutomaticosNeoLoc(): Promise<{ comandosGerados: number }> {
  const supabase = await createClient();

  const { data: dispositivos } = await supabase
    .from("neoloc_dispositivos")
    .select("id, loja_id, status_mdm, contrato_id, contrato:contratos(id, status)")
    .eq("status_mdm", "matriculado")
    .not("contrato_id", "is", null);

  if (!dispositivos || dispositivos.length === 0) return { comandosGerados: 0 };

  const { data: configs } = await supabase.from("neoloc_configuracoes").select("loja_id, dias_cobranca, dias_recolhimento, liberacao_automatica_quitacao");
  const configPorLoja = new Map((configs ?? []).map((c) => [c.loja_id, c]));

  let comandosGerados = 0;

  for (const d of dispositivos) {
    const config = configPorLoja.get(d.loja_id) ?? { dias_cobranca: 5, dias_recolhimento: 4, liberacao_automatica_quitacao: false };
    const contrato = d.contrato as unknown as { id: string; status: string } | null;

    const { data: parcelaAtrasada } = await supabase
      .from("crediario_parcelas")
      .select("dias_atraso")
      .eq("contrato_id", d.contrato_id)
      .eq("status", "atrasado")
      .order("dias_atraso", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: comandoRecente } = await supabase
      .from("neoloc_comandos")
      .select("id")
      .eq("dispositivo_id", d.id)
      .in("tipo", ["bloquear", "modo_perdido"])
      .in("status", ["pending", "sent", "acknowledged", "success"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const decisao = decidirAcaoAutomatica(
      {
        diasAtraso: parcelaAtrasada?.dias_atraso ?? 0,
        statusMdmAtual: d.status_mdm,
        existeComandoDeBloqueioPendenteOuRecente: !!comandoRecente,
        contratoQuitado: contrato?.status === "quitado" || contrato?.status === "encerrado",
        liberacaoAutomaticaQuitacao: config.liberacao_automatica_quitacao,
      },
      { diasCobranca: config.dias_cobranca, diasRecolhimento: config.dias_recolhimento }
    );

    if (decisao.tipo === "nenhuma") continue;

    const tipoComando = decisao.tipo === "bloquear" ? "modo_perdido" : decisao.tipo === "desbloquear" ? "desbloquear" : "remover_mdm";
    const commandId = gerarCommandId(d.id, tipoComando);
    const { error } = await supabase.from("neoloc_comandos").insert({
      command_id: commandId,
      dispositivo_id: d.id,
      tipo: tipoComando,
      origem: decisao.tipo === "remover_mdm" ? "automatico_quitacao" : "automatico_inadimplencia",
      motivo: decisao.motivo,
      contrato_id: d.contrato_id,
      status: "pending",
    });

    // 23505 = unique violation em command_id — já existe comando igual pra hoje, é a idempotência funcionando, não um erro.
    if (!error) {
      comandosGerados++;
      await supabase.from("neoloc_eventos").insert({ dispositivo_id: d.id, tipo: `comando_automatico_${tipoComando}`, motivo: decisao.motivo, resultado: "PENDING — aguardando integração com o MDM (Milestone 1/3)" });
    }
  }

  return { comandosGerados };
}
