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

export interface DestaquePrecoLoja {
  precoVitrine: number;
  precoPix: number;
  percentualDescontoPix: number;
  maiorParcelaSemJuros: number | null; // null = nenhuma parcela sem juros disponível
  valorDaMaiorParcelaSemJuros: number | null;
  cashbackValor: number | null; // null = sem cashback configurado pra esse item
}

/**
 * Ponto único que a loja chama pra saber o que mostrar de preço/Pix/
 * parcelamento — decide sozinho se usa o motor a partir do "preço
 * líquido desejado" (quando o produto tem) ou a partir do preço de
 * vitrine direto (quando não tem, é a maioria hoje). Sempre dado real
 * — taxa configurada, nunca inventada.
 */
export async function calcularDestaquePrecoLoja(precoVenda: number, precoLiquidoDesejado: number | null, produtoId?: string, aparelhoId?: string): Promise<DestaquePrecoLoja> {
  const supabase = await createClient();
  const [{ data: configRaw }, { data: taxasRaw }, { data: cashbackPercentual }] = await Promise.all([
    supabase.rpc("obter_config_precificacao_publico"),
    supabase.rpc("listar_taxas_parcelamento_publico"),
    supabase.rpc("obter_percentual_cashback_publico", { p_produto_id: produtoId ?? null, p_aparelho_id: aparelhoId ?? null }),
  ]);

  const configLinha = configRaw?.[0];
  const configEngine: ConfigPrecificacao = {
    modoJuros: (configLinha?.modo_juros as ConfigPrecificacao["modoJuros"]) ?? "repassar_juros",
    descontoPixPercentual: configLinha?.desconto_pix_percentual ?? 0,
  };
  const taxasEngine: TaxaParcela[] = (taxasRaw ?? []).map((t: { parcela: number; taxa_percentual: number }) => ({
    parcela: t.parcela,
    taxaPercentual: t.taxa_percentual,
  }));
  const engine = new PricingEngine(taxasEngine, configEngine);

  // O preço cadastrado (produto ou "líquido desejado", se tiver) É o
  // valor exato do Pix — nunca recalculado com desconto em cima. O
  // motor só deriva pra CIMA o preço de vitrine/cartão a partir dele.
  const alvo = precoLiquidoDesejado ?? precoVenda;
  const { precoVitrine, parcelas } = engine.calcular(alvo);
  const precoPix = alvo;

  const semJuros = parcelas.filter((p) => !p.temJuros).sort((a, b) => b.numero - a.numero);
  const maior = semJuros[0] ?? null;

  // Percentual mostrado é a economia REAL entre vitrine e Pix — não o
  // campo de configuração isolado, que representava outra coisa antes
  // dessa mudança (desconto adicional sobre um preço já calculado).
  const percentualEconomiaReal = precoVitrine > precoPix ? Math.round(((precoVitrine - precoPix) / precoVitrine) * 100) : 0;
  const cashbackValor = (cashbackPercentual ?? 0) > 0 ? Math.round(precoPix * ((cashbackPercentual ?? 0) / 100) * 100) / 100 : null;

  return {
    precoVitrine,
    precoPix,
    percentualDescontoPix: percentualEconomiaReal,
    maiorParcelaSemJuros: maior?.numero ?? null,
    valorDaMaiorParcelaSemJuros: maior?.valorParcela ?? null,
    cashbackValor,
  };
}
