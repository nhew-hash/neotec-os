"use client";

import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { tocarSomNotificacao, usePreferenciasNotificacao } from "@/hooks/use-preferencias-notificacao";

/** Som de mensagem nova com o app aberto (preferência deste aparelho). */
export function SomMensagem() {
  const { preferencias, atualizar, carregado } = usePreferenciasNotificacao();
  if (!carregado) return null;
  return (
    <div className="space-y-3">
      <label className="flex items-start gap-3 rounded-lg border border-border p-3">
        <Checkbox checked={preferencias.somAtivo} onCheckedChange={(v) => atualizar({ somAtivo: v === true })} className="mt-0.5" />
        <span>
          <span className="flex items-center gap-1.5 text-sm font-medium">{preferencias.somAtivo ? <Volume2 className="h-4 w-4" aria-hidden /> : <VolumeX className="h-4 w-4" aria-hidden />}Tocar som de mensagem nova</span>
          <span className="block text-xs text-muted-foreground">Com o app aberto, em qualquer tela. Com o app fechado, o celular usa o som de notificação dele.</span>
        </span>
      </label>
      <Button type="button" variant="outline" size="sm" onClick={tocarSomNotificacao}>Testar som</Button>
    </div>
  );
}
