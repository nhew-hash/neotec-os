"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { atualizarConfigAction } from "@/services/neo-performance/neo-performance.actions";
import type { NeoPerformanceConfig } from "@/types";

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export function ConfigPerformanceForm({ config }: { config: NeoPerformanceConfig | null }) {
  const [isPending, startTransition] = useTransition();
  const [salvo, setSalvo] = useState(false);
  const [valores, setValores] = useState({
    segmento: config?.segmento ?? "",
    ticket_medio_alvo: config?.ticket_medio_alvo?.toString() ?? "",
    margem_media_alvo: config?.margem_media_alvo?.toString() ?? "",
    cac_desejado: config?.cac_desejado?.toString() ?? "",
    meta_faturamento_mensal: config?.meta_faturamento_mensal?.toString() ?? "",
    meta_vendas_mensal: config?.meta_vendas_mensal?.toString() ?? "",
    limite_diario: config?.limite_diario?.toString() ?? "",
    limite_semanal: config?.limite_semanal?.toString() ?? "",
    limite_mensal: config?.limite_mensal?.toString() ?? "",
    limite_por_campanha: config?.limite_por_campanha?.toString() ?? "",
    max_aumento_automatico_pct: config?.max_aumento_automatico_pct?.toString() ?? "",
    max_reducao_automatica_pct: config?.max_reducao_automatica_pct?.toString() ?? "",
    cac_maximo: config?.cac_maximo?.toString() ?? "",
    margem_minima_pct: config?.margem_minima_pct?.toString() ?? "",
    roas_minimo: config?.roas_minimo?.toString() ?? "",
  });

  function campo(nome: keyof typeof valores) {
    return {
      value: valores[nome],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setValores((v) => ({ ...v, [nome]: e.target.value })),
    };
  }

  function handleSalvar() {
    setSalvo(false);
    const paraNumero = (s: string) => (s.trim() === "" ? null : Number(s));
    startTransition(async () => {
      await atualizarConfigAction({
        segmento: valores.segmento || null,
        ticket_medio_alvo: paraNumero(valores.ticket_medio_alvo),
        margem_media_alvo: paraNumero(valores.margem_media_alvo),
        cac_desejado: paraNumero(valores.cac_desejado),
        meta_faturamento_mensal: paraNumero(valores.meta_faturamento_mensal),
        meta_vendas_mensal: paraNumero(valores.meta_vendas_mensal),
        limite_diario: paraNumero(valores.limite_diario),
        limite_semanal: paraNumero(valores.limite_semanal),
        limite_mensal: paraNumero(valores.limite_mensal),
        limite_por_campanha: paraNumero(valores.limite_por_campanha),
        max_aumento_automatico_pct: paraNumero(valores.max_aumento_automatico_pct),
        max_reducao_automatica_pct: paraNumero(valores.max_reducao_automatica_pct),
        cac_maximo: paraNumero(valores.cac_maximo),
        margem_minima_pct: paraNumero(valores.margem_minima_pct),
        roas_minimo: paraNumero(valores.roas_minimo),
      });
      setSalvo(true);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Campo label="Segmento"><Input {...campo("segmento")} /></Campo>
        <Campo label="Ticket médio alvo (R$)"><Input type="number" {...campo("ticket_medio_alvo")} /></Campo>
        <Campo label="Margem média alvo (%)"><Input type="number" {...campo("margem_media_alvo")} /></Campo>
        <Campo label="CAC desejado (R$)"><Input type="number" {...campo("cac_desejado")} /></Campo>
        <Campo label="Meta de faturamento mensal (R$)"><Input type="number" {...campo("meta_faturamento_mensal")} /></Campo>
        <Campo label="Meta de vendas mensal"><Input type="number" {...campo("meta_vendas_mensal")} /></Campo>
      </div>

      <div className="border-t border-border pt-4">
        <p className="mb-3 text-sm font-medium text-foreground">Limites de orçamento</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Campo label="Limite diário (R$)"><Input type="number" {...campo("limite_diario")} /></Campo>
          <Campo label="Limite semanal (R$)"><Input type="number" {...campo("limite_semanal")} /></Campo>
          <Campo label="Limite mensal (R$)"><Input type="number" {...campo("limite_mensal")} /></Campo>
          <Campo label="Limite por campanha (R$)"><Input type="number" {...campo("limite_por_campanha")} /></Campo>
          <Campo label="Máx. aumento automático (%)"><Input type="number" {...campo("max_aumento_automatico_pct")} /></Campo>
          <Campo label="Máx. redução automática (%)"><Input type="number" {...campo("max_reducao_automatica_pct")} /></Campo>
          <Campo label="CAC máximo (R$)"><Input type="number" {...campo("cac_maximo")} /></Campo>
          <Campo label="Margem mínima (%)"><Input type="number" {...campo("margem_minima_pct")} /></Campo>
          <Campo label="ROAS mínimo"><Input type="number" {...campo("roas_minimo")} /></Campo>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={handleSalvar} disabled={isPending}>{isPending ? "Salvando..." : "Salvar"}</Button>
        {salvo && <span className="text-xs text-success">Salvo.</span>}
      </div>
    </div>
  );
}
