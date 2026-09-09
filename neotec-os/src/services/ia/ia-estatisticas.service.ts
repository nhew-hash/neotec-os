import { createClient } from "@/lib/supabase/server";

export interface EstatisticasUsoIA {
  chamadasUltimos30Dias: number;
  tokensEntradaTotal: number;
  tokensSaidaTotal: number;
  custoEstimadoTotal: number;
  taxaSucesso: number;
  ultimaChamada: string | null;
}

export async function obterEstatisticasUsoIA(): Promise<EstatisticasUsoIA> {
  const supabase = await createClient();
  const trintaDiasAtras = new Date();
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

  const { data, error } = await supabase
    .from("ia_logs")
    .select("tokens_entrada, tokens_saida, custo_estimado_usd, sucesso, created_at")
    .gte("created_at", trintaDiasAtras.toISOString())
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Não foi possível carregar as estatísticas de IA: ${error.message}`);

  const logs = data ?? [];
  const sucessos = logs.filter((l) => l.sucesso).length;

  return {
    chamadasUltimos30Dias: logs.length,
    tokensEntradaTotal: logs.reduce((acc, l) => acc + (l.tokens_entrada ?? 0), 0),
    tokensSaidaTotal: logs.reduce((acc, l) => acc + (l.tokens_saida ?? 0), 0),
    custoEstimadoTotal: logs.reduce((acc, l) => acc + (l.custo_estimado_usd ?? 0), 0),
    taxaSucesso: logs.length > 0 ? (sucessos / logs.length) * 100 : 100,
    ultimaChamada: logs[0]?.created_at ?? null,
  };
}
