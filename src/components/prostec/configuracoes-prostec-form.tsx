"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { salvarConfiguracoesProstecAction } from "@/services/prostec/prostec.actions";
interface ProstecSettings {
  score_quente_min: number;
  score_morno_min: number;
  segmentos_disponiveis: string[];
  cidades_sugeridas: string[];
  raio_padrao_km: number;
  quantidade_padrao: number;
  comissao_pct_padrao: number;
  valor_venda_padrao: number;
  status_disponiveis: string[];
}

export function ConfiguracoesProstecForm({ config }: { config: ProstecSettings }) {
  const [isPending, startTransition] = useTransition();
  const [salvo, setSalvo] = useState(false);

  function handleSubmit(formData: FormData) {
    setSalvo(false);
    startTransition(async () => {
      const result = await salvarConfiguracoesProstecAction(formData);
      if (result.success) setSalvo(true);
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-5 rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
      <div>
        <p className="mb-2 text-sm font-semibold text-foreground">Faixas de temperatura</p>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Score mínimo pra 'quente'" name="score_quente_min" defaultValue={config.score_quente_min} />
          <Campo label="Score mínimo pra 'morno'" name="score_morno_min" defaultValue={config.score_morno_min} />
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-foreground">Prospecção padrão</p>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Raio padrão (km)" name="raio_padrao_km" defaultValue={config.raio_padrao_km} />
          <Campo label="Quantidade padrão por busca" name="quantidade_padrao" defaultValue={config.quantidade_padrao} />
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-foreground">Comissão e venda</p>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Comissão padrão (%)" name="comissao_pct_padrao" defaultValue={config.comissao_pct_padrao} />
          <Campo label="Valor de venda padrão (R$)" name="valor_venda_padrao" defaultValue={config.valor_venda_padrao} />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Segmentos disponíveis (separados por vírgula)</label>
        <Input name="segmentos_disponiveis" defaultValue={config.segmentos_disponiveis.join(", ")} className="mt-1" />
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Cidades sugeridas (separadas por vírgula)</label>
        <Input name="cidades_sugeridas" defaultValue={config.cidades_sugeridas.join(", ")} className="mt-1" />
      </div>

      {salvo && <p className="text-xs font-medium text-success">Configurações salvas.</p>}

      <Button type="submit" disabled={isPending} className="self-start">{isPending ? "Salvando..." : "Salvar configurações"}</Button>
    </form>
  );
}

function Campo({ label, name, defaultValue }: { label: string; name: string; defaultValue: number }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Input type="number" name={name} defaultValue={defaultValue} className="mt-1" />
    </div>
  );
}
