"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { atualizarConfigPrecificacaoAction, atualizarTaxaParcelamentoAction } from "@/services/precificacao/precificacao.actions";
import { PricingEngine } from "@/services/precificacao/pricing-engine";
import { formatCurrency } from "@/utils";
import type { ConfiguracaoPrecificacao, TaxaParcelamentoDb } from "@/types";

export function PrecificacaoPanel({ config: configInicial, taxas: taxasIniciais }: { config: ConfiguracaoPrecificacao; taxas: TaxaParcelamentoDb[] }) {
  const router = useRouter();
  const [modoJuros, setModoJuros] = useState(configInicial.modo_juros);
  const [descontoPix, setDescontoPix] = useState(configInicial.desconto_pix_percentual);
  const [cashbackPercentual, setCashbackPercentual] = useState(configInicial.cashback_percentual_padrao);
  const [whatsappStaff, setWhatsappStaff] = useState(configInicial.whatsapp_notificacao_staff ?? "");
  const [taxas, setTaxas] = useState(taxasIniciais);
  const [simuladorPreco, setSimuladorPreco] = useState(7400);
  const [simuladorCusto, setSimuladorCusto] = useState(5000);

  function salvarConfig(input: Partial<Pick<ConfiguracaoPrecificacao, "modo_juros" | "desconto_pix_percentual" | "cashback_percentual_padrao" | "whatsapp_notificacao_staff">>) {
    atualizarConfigPrecificacaoAction(input).then(() => router.refresh());
  }

  function salvarTaxa(id: string, valor: number) {
    setTaxas((prev) => prev.map((t) => (t.id === id ? { ...t, taxa_percentual: valor } : t)));
    atualizarTaxaParcelamentoAction(id, valor).then(() => router.refresh());
  }

  // Simulador — usa o MESMO PricingEngine que a loja usa de verdade,
  // com as taxas do estado local (reflete edição em tempo real, antes
  // até de salvar) — "alterando qualquer taxa, tudo recalcula sozinho".
  const resultado = useMemo(() => {
    const engine = new PricingEngine(
      taxas.filter((t) => t.ativo).map((t) => ({ parcela: t.parcela, taxaPercentual: t.taxa_percentual })),
      { modoJuros, descontoPixPercentual: descontoPix }
    );
    return engine.calcular(simuladorPreco, simuladorCusto || null);
  }, [taxas, modoJuros, descontoPix, simuladorPreco, simuladorCusto]);

  const taxaPix = taxas.find((t) => t.parcela === 0);
  const taxasParcelas = taxas.filter((t) => t.parcela >= 1).sort((a, b) => a.parcela - b.parcela);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader><CardTitle>Modo de juros</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={modoJuros === "repassar_juros"} onChange={() => { setModoJuros("repassar_juros"); salvarConfig({ modo_juros: "repassar_juros" }); }} className="accent-primary" />
              Repassar juros ao cliente
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={modoJuros === "embutir_juros"} onChange={() => { setModoJuros("embutir_juros"); salvarConfig({ modo_juros: "embutir_juros" }); }} className="accent-primary" />
              Embutir juros no preço (oferece parcelamento "sem juros" pro cliente)
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Desconto Pix</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Input type="number" step="0.1" value={descontoPix} onChange={(e) => setDescontoPix(Number(e.target.value) || 0)} onBlur={(e) => salvarConfig({ desconto_pix_percentual: Number(e.target.value) || 0 })} className="w-24" />
              <span className="text-sm text-muted-foreground">% de desconto pra quem paga no Pix</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Cashback</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Input type="number" step="0.1" value={cashbackPercentual} onChange={(e) => setCashbackPercentual(Number(e.target.value) || 0)} onBlur={(e) => salvarConfig({ cashback_percentual_padrao: Number(e.target.value) || 0 })} className="w-24" />
              <span className="text-sm text-muted-foreground">% que o cliente recebe de volta em saldo, em toda compra (padrão — dá pra sobrescrever por produto)</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Notificação de pedido e trade-in</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Input
                type="tel" placeholder="41999999999" value={whatsappStaff}
                onChange={(e) => setWhatsappStaff(e.target.value)}
                onBlur={(e) => salvarConfig({ whatsapp_notificacao_staff: e.target.value.trim() || null })}
                className="w-48"
              />
              <span className="text-sm text-muted-foreground">Número (com DDD, sem +55) que recebe aviso automático no WhatsApp toda vez que entrar pedido novo ou solicitação de trade-in. Deixa vazio pra desligar.</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Tabela de taxas</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="mb-1 text-xs text-muted-foreground">100% editável — nunca fixa em código. Troque de gateway (Mercado Pago, InfinitePay, Stone, PagBank) só reeditando aqui.</p>
            {taxaPix && (
              <div className="flex items-center justify-between rounded-md bg-secondary px-3 py-2">
                <span className="text-sm font-medium text-foreground">Pix</span>
                <div className="flex items-center gap-1">
                  <Input type="number" step="0.01" defaultValue={taxaPix.taxa_percentual} onBlur={(e) => salvarTaxa(taxaPix.id, Number(e.target.value) || 0)} className="h-7 w-20 text-xs" />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              </div>
            )}
            {taxasParcelas.map((t) => (
              <div key={t.id} className="flex items-center justify-between border-b border-border py-1.5 last:border-0">
                <span className="text-sm text-foreground">{t.parcela}x</span>
                <div className="flex items-center gap-1">
                  <Input type="number" step="0.01" defaultValue={t.taxa_percentual} onBlur={(e) => salvarTaxa(t.id, Number(e.target.value) || 0)} className="h-7 w-20 text-xs" />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader><CardTitle>Simulador</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex gap-2">
              <div className="flex flex-1 flex-col gap-1">
                <label className="text-xs text-muted-foreground">Preço líquido desejado</label>
                <Input type="number" value={simuladorPreco} onChange={(e) => setSimuladorPreco(Number(e.target.value) || 0)} />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <label className="text-xs text-muted-foreground">Custo (opcional, pra ver lucro)</label>
                <Input type="number" value={simuladorCusto} onChange={(e) => setSimuladorCusto(Number(e.target.value) || 0)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-2 p-4 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Preço de vitrine</span><span className="neotec-dado font-semibold text-foreground">{formatCurrency(resultado.precoVitrine)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Preço Pix</span><span className="neotec-dado font-semibold text-success">{formatCurrency(resultado.precoPix)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Recebimento líquido (Pix)</span><span className="neotec-dado">{formatCurrency(resultado.recebimentoLiquidoPix)}</span></div>
            {resultado.lucroLiquidoVitrine != null && (
              <div className="flex justify-between border-t border-border pt-2"><span className="text-muted-foreground">Lucro líquido</span><span className="neotec-dado font-semibold text-success">{formatCurrency(resultado.lucroLiquidoVitrine)}</span></div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Parcelas</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-1">
            {resultado.parcelas.map((p) => (
              <div key={p.numero} className="flex items-center justify-between text-xs">
                <span className="text-foreground">{p.numero}x de {formatCurrency(p.valorParcela)}</span>
                <span className={p.temJuros ? "text-warning" : "text-success"}>{p.temJuros ? "com juros" : "sem juros"} — recebe {formatCurrency(p.recebimentoLiquido)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
