"use client";

import { useState, useTransition } from "react";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { iniciarBotProstecAction } from "@/services/prostec/prostec.actions";

export function EnviarBotButton({ leadId, telefone, nomeEmpresa }: { leadId: string; telefone: string | null; nomeEmpresa: string }) {
  const [isPending, startTransition] = useTransition();
  const [resultado, setResultado] = useState<{ sucesso: boolean; mensagem: string } | null>(null);

  if (!telefone) return <p className="text-xs text-muted-foreground">Sem WhatsApp cadastrado — não dá pra enviar pro bot.</p>;

  function handleEnviar() {
    setResultado(null);
    startTransition(async () => {
      const result = await iniciarBotProstecAction(leadId, telefone!, nomeEmpresa);
      setResultado(result.success ? { sucesso: true, mensagem: "Bot iniciou a conversa! Acompanha em Inbox." } : { sucesso: false, mensagem: result.error });
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="outline" onClick={handleEnviar} disabled={isPending} className="gap-1.5">
        <Bot className="h-4 w-4" />{isPending ? "Enviando..." : "Enviar pro bot (WhatsApp)"}
      </Button>
      {resultado && <p className={`text-xs ${resultado.sucesso ? "text-success-text" : "text-danger"}`}>{resultado.mensagem}</p>}
    </div>
  );
}
