"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { atualizarConfiguracaoAction } from "@/services/neoloc/neoloc.actions";
import type { NeolocConfiguracao } from "@/types/neoloc";

export function ConfiguracaoForm({ configuracao }: { configuracao: NeolocConfiguracao }) {
  const [isPending, startTransition] = useTransition();
  const [diasCobranca, setDiasCobranca] = useState(String(configuracao.dias_cobranca));
  const [diasRecolhimento, setDiasRecolhimento] = useState(String(configuracao.dias_recolhimento));
  const [liberacaoAutomatica, setLiberacaoAutomatica] = useState(configuracao.liberacao_automatica_quitacao);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  function salvar() {
    setErro(null);
    setSalvo(false);
    startTransition(async () => {
      const resultado = await atualizarConfiguracaoAction({
        diasCobranca: Number(diasCobranca),
        diasRecolhimento: Number(diasRecolhimento),
        liberacaoAutomaticaQuitacao: liberacaoAutomatica,
      });
      if (!resultado.success) {
        setErro(resultado.error);
        return;
      }
      setSalvo(true);
    });
  }

  return (
    <div className="flex max-w-lg flex-col gap-4 rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="dias-cobranca">Dias de cobrança antes do bloqueio</Label>
        <Input id="dias-cobranca" type="number" min={1} value={diasCobranca} onChange={(e) => setDiasCobranca(e.target.value)} />
        <p className="text-xs text-muted-foreground">Depois desse período de atraso (contado pela mesma régua do Crediário), o NeoLoc passa a gerar um comando de bloqueio automático.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="dias-recolhimento">Dias para recolhimento após o bloqueio</Label>
        <Input id="dias-recolhimento" type="number" min={1} value={diasRecolhimento} onChange={(e) => setDiasRecolhimento(e.target.value)} />
        <p className="text-xs text-muted-foreground">Só gera um alerta pro funcionário — nenhuma ação destrutiva automática é executada.</p>
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" checked={liberacaoAutomatica} onChange={(e) => setLiberacaoAutomatica(e.target.checked)} />
        Liberar o aparelho automaticamente ao quitar (padrão: exigir confirmação do administrador)
      </label>

      {erro && <p className="text-sm text-red-600">{erro}</p>}
      {salvo && <p className="text-sm text-emerald-600">Configuração salva.</p>}

      <Button type="button" onClick={salvar} disabled={isPending} className="w-fit">
        {isPending ? "Salvando…" : "Salvar"}
      </Button>
    </div>
  );
}
