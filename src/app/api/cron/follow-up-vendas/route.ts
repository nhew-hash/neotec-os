import { NextResponse, type NextRequest } from "next/server";
import { processarFollowupsDeVenda } from "@/services/ia/followup-vendas.service";
import { processarRetiradasAgendadas } from "@/services/estoque/estoque.actions";
import { expirarPerguntasAntigas } from "@/services/ia/ia-pergunta-equipe.service";
import { gerarFollowupsAutomaticos } from "@/services/crm-pipeline/crm-pipeline.service";
import { gerarFollowupsAutomaticosProstec, verificarTaxaOptOutProstec, recalcularNextBestActionTodosLeads } from "@/services/prostec/prostec.service";
import { executarReguaCobranca } from "@/services/crediario/crediario.service";

/**
 * Chamada pelo Vercel Cron (ver vercel.json) — nunca pelo navegador.
 * Autenticada pelo header que a própria Vercel envia quando CRON_SECRET
 * está configurada (não é uma rota pública, mesmo sem sessão de usuário).
 *
 * Também processa retiradas agendadas da loja (Fase 148) — junto
 * nessa mesma rota diária, pra não precisar de um segundo cron no
 * plano gratuito da Vercel (limite de 2, e não vale a pena gastar o
 * segundo com algo que também pode rodar 1x por dia).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");

  if (secret && auth !== `Bearer ${secret}`) {
    return new NextResponse("Não autorizado", { status: 401 });
  }

  try {
    const resultado = await processarFollowupsDeVenda();
    const retiradas = await processarRetiradasAgendadas();
    const perguntasExpiradas = await expirarPerguntasAntigas();
    const followupsAutomaticos = await gerarFollowupsAutomaticos();
    const followupsProstec = await gerarFollowupsAutomaticosProstec();
    const circuitBreakerOptOut = await verificarTaxaOptOutProstec();
    const nextBestAction = await recalcularNextBestActionTodosLeads();
    const reguaCobranca = await executarReguaCobranca();
    return NextResponse.json({ ok: true, ...resultado, retiradas, perguntasExpiradas, followupsAutomaticos, followupsProstec, circuitBreakerOptOut, nextBestAction, reguaCobranca });
  } catch (err) {
    console.error("Falha ao processar follow-ups de venda:", err);
    return NextResponse.json(
      { ok: false, erro: err instanceof Error ? err.message : "Erro desconhecido" },
      { status: 500 }
    );
  }
}
