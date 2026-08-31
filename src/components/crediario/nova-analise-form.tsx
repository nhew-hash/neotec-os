"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { criarPropostaCreditoAction } from "@/services/crediario/crediario.actions";

export function NovaAnaliseForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [clienteId, setClienteId] = useState("");
  const [possuiRestricao, setPossuiRestricao] = useState(false);
  const [scoreBureau, setScoreBureau] = useState("");

  function handleSubmit() {
    setErro(null);
    if (!clienteId) return setErro("Informa o ID do cliente");

    startTransition(async () => {
      const result = await criarPropostaCreditoAction(clienteId, possuiRestricao, scoreBureau ? Number(scoreBureau) : null);
      if (!result.success) return setErro(result.error);
      router.push(`/crediario/propostas/${result.data.propostaId}`);
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-black/[0.06] bg-white p-6 shadow-sm">
      <div>
        <label className="text-xs font-medium text-muted-foreground">ID do cliente *</label>
        <Input value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="mt-1" placeholder="Cole o UUID do cliente (busca em Clientes)" />
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" checked={possuiRestricao} onChange={(e) => setPossuiRestricao(e.target.checked)} className="h-4 w-4 accent-primary" />
        <label className="text-xs font-medium text-foreground">Cliente possui restrição (negativado)</label>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Score do bureau, se já consultou (0-1000)</label>
        <Input type="number" value={scoreBureau} onChange={(e) => setScoreBureau(e.target.value)} className="mt-1" placeholder="Deixa vazio se ainda não consultou" />
      </div>

      {erro && <p className="text-xs text-danger">{erro}</p>}
      <Button type="button" onClick={handleSubmit} disabled={isPending}>{isPending ? "Calculando..." : "Calcular score e classe"}</Button>
    </div>
  );
}
