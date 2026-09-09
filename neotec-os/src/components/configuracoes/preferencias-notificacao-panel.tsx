"use client";

import { Volume2, Monitor, MessageSquareText, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePreferenciasNotificacao, tocarSomNotificacao } from "@/hooks/use-preferencias-notificacao";

export function PreferenciasNotificacaoPanel() {
  const { preferencias, atualizar, carregado } = usePreferenciasNotificacao();

  function pedirPermissaoDesktop() {
    if ("Notification" in window) void Notification.requestPermission();
  }

  if (!carregado) return null; // evita flash de valores padrão antes de ler o localStorage

  return (
    <Card>
      <CardHeader><CardTitle>Notificações do WhatsApp</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-xs text-muted-foreground">
          Essas preferências são do seu computador/navegador, não da loja — cada pessoa que atende pode configurar do seu jeito.
        </p>

        <label className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
          <span className="flex items-center gap-2 text-sm text-foreground">
            <Volume2 className="h-4 w-4 text-muted-foreground" />Som de mensagem nova
          </span>
          <div className="flex items-center gap-2">
            {preferencias.somAtivo && (
              <Button type="button" variant="ghost" size="sm" onClick={tocarSomNotificacao}>Testar</Button>
            )}
            <input
              type="checkbox"
              checked={preferencias.somAtivo}
              onChange={(e) => atualizar({ somAtivo: e.target.checked })}
              className="h-4 w-4 accent-primary"
            />
          </div>
        </label>

        <label className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
          <span className="flex items-center gap-2 text-sm text-foreground">
            <Monitor className="h-4 w-4 text-muted-foreground" />Notificação desktop
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={pedirPermissaoDesktop}>Permitir no navegador</Button>
            <input
              type="checkbox"
              checked={preferencias.notificacaoDesktopAtiva}
              onChange={(e) => atualizar({ notificacaoDesktopAtiva: e.target.checked })}
              className="h-4 w-4 accent-primary"
            />
          </div>
        </label>

        <label className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
          <span className="flex items-center gap-2 text-sm text-foreground">
            <MessageSquareText className="h-4 w-4 text-muted-foreground" />Abrir conversa nova automaticamente
          </span>
          <input
            type="checkbox"
            checked={preferencias.autoAbrirConversaNova}
            onChange={(e) => atualizar({ autoAbrirConversaNova: e.target.checked })}
            className="h-4 w-4 accent-primary"
          />
        </label>

        <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
          <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
          A notificação desktop só funciona se o navegador tiver permissão concedida — clique em "Permitir no navegador" e aceite o pedido que aparecer.
        </p>
      </CardContent>
    </Card>
  );
}
