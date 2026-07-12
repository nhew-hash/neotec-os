"use client";

import { useState, useTransition } from "react";
import { KeyRound, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { criarAcessoPortalAction } from "@/services/portal/portal.actions";

export function CriarAcessoPortalButton({ clienteId, jaTemAcesso }: { clienteId: string; jaTemAcesso: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [resultado, setResultado] = useState<{ email: string; senhaProvisoria: string } | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function handleClick() {
    setErro(null);
    startTransition(async () => {
      const result = await criarAcessoPortalAction(clienteId);
      if (!result.success) return setErro(result.error);
      setResultado(result.data);
    });
  }

  if (resultado) {
    return (
      <div className="flex flex-col gap-2 rounded-md border border-success bg-success-soft p-3 text-sm">
        <p className="font-medium text-foreground">Acesso criado. Repasse ao cliente (só aparece uma vez):</p>
        <div className="flex items-center justify-between rounded bg-background px-2 py-1.5 font-mono text-xs">
          <span>{resultado.email} / {resultado.senhaProvisoria}</span>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(`${resultado.email} / ${resultado.senhaProvisoria}`)}
          >
            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>
    );
  }

  if (jaTemAcesso) {
    return <p className="text-xs text-muted-foreground">Cliente já tem acesso ao portal.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <Button variant="outline" size="sm" onClick={handleClick} disabled={isPending}>
        <KeyRound className="h-4 w-4" />
        {isPending ? "Criando..." : "Criar acesso ao portal"}
      </Button>
      {erro && <p className="text-xs text-danger">{erro}</p>}
    </div>
  );
}
