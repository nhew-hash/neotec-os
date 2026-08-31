"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { responderPropostaPublicaAction } from "@/services/prostec/prostec.actions";
import { formatCurrency } from "@/utils";
import type { PropostaPublica } from "@/services/prostec/prostec.service";

export function PropostaPublicaCliente({ proposta, token }: { proposta: PropostaPublica; token: string }) {
  const [status, setStatus] = useState(proposta.status);
  const [enviando, setEnviando] = useState(false);

  async function handleResponder(resposta: "aceita" | "recusada") {
    setEnviando(true);
    await responderPropostaPublicaAction(token, resposta);
    setEnviando(false);
    setStatus(resposta);
  }

  if (status === "aceita" || status === "recusada") {
    return (
      <Card radius="loose" className="flex flex-col items-center gap-3 p-8 text-center">
        {status === "aceita" ? <CheckCircle2 className="h-10 w-10 text-success" /> : <XCircle className="h-10 w-10 text-muted-foreground" />}
        <p className="text-sm font-medium text-foreground">{status === "aceita" ? "Proposta aceita! A Neotec vai entrar em contato pra dar os próximos passos." : "Ok, sem problema. Se mudar de ideia, é só chamar a gente."}</p>
      </Card>
    );
  }

  return (
    <Card radius="loose" className="flex flex-col gap-4 p-6">
      <div className="flex items-center gap-2 text-primary">
        <Rocket className="h-5 w-5" />
        <span className="text-xs font-semibold uppercase tracking-wide">Proposta Neotec</span>
      </div>

      {proposta.empresa_nome && <p className="text-sm text-muted-foreground">Preparada especialmente pra {proposta.empresa_nome}</p>}

      <div className="rounded-xl bg-secondary/50 p-4">
        <p className="text-sm font-medium text-foreground">{proposta.produto}</p>
        <p className="mt-1 font-display text-2xl font-bold text-foreground">{formatCurrency(proposta.valor)}</p>
        {proposta.forma_pagamento && <p className="text-xs text-muted-foreground">{proposta.forma_pagamento}</p>}
      </div>

      <div className="flex gap-2">
        <Button type="button" onClick={() => handleResponder("aceita")} disabled={enviando} className="flex-1">Aceitar proposta</Button>
        <Button type="button" variant="outline" onClick={() => handleResponder("recusada")} disabled={enviando}>Recusar</Button>
      </div>
    </Card>
  );
}
