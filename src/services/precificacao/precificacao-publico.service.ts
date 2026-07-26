import { createClient } from "@/lib/supabase/server";
import { PricingEngine, type TaxaParcela, type ConfigPrecificacao } from "./pricing-engine";

/** Mesmo padrão de `obterPricingEngine` (admin), só que via função pública (sem sessão) — usado pela loja. */
export async function obterPricingEnginePublico(): Promise<PricingEngine> {
  const supabase = await createClient();
  const [{ data: config }, { data: taxas }] = await Promise.all([
    supabase.rpc("obter_config_precificacao_publico"),
    supabase.rpc("listar_taxas_parcelamento_publico"),
  ]);

  const configLinha = config?.[0];
  const configEngine: ConfigPrecificacao = {
    modoJuros: (configLinha?.modo_juros as ConfigPrecificacao["modoJuros"]) ?? "repassar_juros",
    descontoPixPercentual: configLinha?.desconto_pix_percentual ?? 0,
  };

  const taxasEngine: TaxaParcela[] = (taxas ?? []).map((t: { parcela: number; taxa_percentual: number }) => ({
    parcela: t.parcela,
    taxaPercentual: t.taxa_percentual,
  }));

  return new PricingEngine(taxasEngine, configEngine);
}
