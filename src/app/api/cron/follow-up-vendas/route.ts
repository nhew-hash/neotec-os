import { cronAutorizado } from "@/lib/cron-auth";
import { NextResponse, type NextRequest } from "next/server";
import { gerarSugestoesComerciais } from "@/services/ia/sugestoes-comerciais.service";
import { processarFollowupsDeVenda } from "@/services/ia/followup-vendas.service";
import { processarRetiradasAgendadas } from "@/services/estoque/estoque.actions";
import { expirarPerguntasAntigas } from "@/services/ia/ia-pergunta-equipe.service";
import { gerarFollowupsAutomaticos } from "@/services/crm-pipeline/crm-pipeline.service";
import { gerarFollowupsAutomaticosProstec, verificarTaxaOptOutProstec, recalcularNextBestActionTodosLeads } from "@/services/prostec/prostec.service";
import { executarReguaCobranca } from "@/services/crediario/crediario.service";
import { avaliarBloqueiosAutomaticosNeoLoc } from "@/services/neoloc/avaliar-bloqueios";

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

  if (!cronAutorizado(secret, auth)) {
    return new NextResponse("Não autorizado", { status: 401 });
  }

  // Cada job é isolado: um erro não impede os seguintes (antes, uma falha em
  // qualquer ponto cancelava a régua de cobrança e os bloqueios do NeoLoc no dia).
  const erros: Record<string, string> = {};
  async function rodar<T>(nome: string, fn: () => Promise<T>): Promise<T | null> {
    try {
      return await fn();
    } catch (err) {
      console.error(`Falha no job "${nome}" do cron diário:`, err);
      erros[nome] = err instanceof Error ? err.message : "Erro desconhecido";
      return null;
    }
  }

  const resultado = await rodar("followupVendas", processarFollowupsDeVenda);
  const retiradas = await rodar("retiradasAgendadas", processarRetiradasAgendadas);
  const perguntasExpiradas = await rodar("perguntasExpiradas", expirarPerguntasAntigas);
  const followupsAutomaticos = await rodar("followupsAutomaticos", gerarFollowupsAutomaticos);
  const sugestoesComerciais = await rodar("sugestoesComerciais", () => gerarSugestoesComerciais());
  const followupsProstec = await rodar("followupsProstec", gerarFollowupsAutomaticosProstec);
  const circuitBreakerOptOut = await rodar("circuitBreakerOptOut", verificarTaxaOptOutProstec);
  const nextBestAction = await rodar("nextBestAction", recalcularNextBestActionTodosLeads);
  const reguaCobranca = await rodar("reguaCobranca", executarReguaCobranca);
  const neolocBloqueios = await rodar("neolocBloqueios", avaliarBloqueiosAutomaticosNeoLoc);

  const ok = Object.keys(erros).length === 0;
  return NextResponse.json(
    { ok, ...(resultado ?? {}), retiradas, perguntasExpiradas, followupsAutomaticos, sugestoesComerciais, followupsProstec, circuitBreakerOptOut, nextBestAction, reguaCobranca, neolocBloqueios, erros },
    { status: ok ? 200 : 500 },
  );
}

