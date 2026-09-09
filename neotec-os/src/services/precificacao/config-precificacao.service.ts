import { createClient } from "@/lib/supabase/server";
import { PricingEngine, type TaxaParcela, type ConfigPrecificacao } from "./pricing-engine";
import type { ConfiguracaoPrecificacao, TaxaParcelamentoDb } from "@/types";

export async function buscarConfigPrecificacao(): Promise<ConfiguracaoPrecificacao | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("configuracoes_precificacao").select("*").maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function atualizarConfigPrecificacao(input: Partial<Pick<ConfiguracaoPrecificacao, "modo_juros" | "desconto_pix_percentual">>): Promise<void> {
  const supabase = await createClient();
  const { data: linha } = await supabase.from("configuracoes_precificacao").select("id").maybeSingle();
  if (!linha) throw new Error("Configuração não encontrada");
  const { error } = await supabase.from("configuracoes_precificacao").update(input).eq("id", linha.id);
  if (error) throw new Error(error.message);
}

export async function listarTaxasParcelamento(): Promise<TaxaParcelamentoDb[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("tabela_taxas_parcelamento").select("*").order("parcela");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function atualizarTaxaParcelamento(id: string, taxaPercentual: number): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("tabela_taxas_parcelamento").update({ taxa_percentual: taxaPercentual }).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Monta o motor já pronto, pra qualquer parte do sistema (loja, checkout, financeiro) usar sem repetir a busca de config/taxas. */
export async function obterPricingEngine(): Promise<PricingEngine> {
  const [config, taxas] = await Promise.all([buscarConfigPrecificacao(), listarTaxasParcelamento()]);

  const configEngine: ConfigPrecificacao = {
    modoJuros: config?.modo_juros ?? "repassar_juros",
    descontoPixPercentual: config?.desconto_pix_percentual ?? 0,
  };
  const taxasEngine: TaxaParcela[] = taxas.filter((t) => t.ativo).map((t) => ({ parcela: t.parcela, taxaPercentual: t.taxa_percentual }));

  return new PricingEngine(taxasEngine, configEngine);
}
