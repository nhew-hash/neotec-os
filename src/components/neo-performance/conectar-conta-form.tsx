"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { conectarContaAction } from "@/services/neo-performance/neo-performance.actions";
import type { PlataformaAds } from "@/types";

export function ConectarContaForm() {
  const [isPending, startTransition] = useTransition();
  const [plataforma, setPlataforma] = useState<PlataformaAds>("meta");
  const [contaId, setContaId] = useState("");
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  function handleConectar() {
    if (!contaId.trim()) return;
    setErro(null);
    startTransition(async () => {
      const resultado = await conectarContaAction(plataforma, contaId.trim(), nome.trim() || undefined);
      if (!resultado.success) setErro(resultado.error);
      else { setContaId(""); setNome(""); }
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-md border border-dashed border-border p-3">
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Plataforma</span>
        <Select value={plataforma} onValueChange={(v) => setPlataforma(v as PlataformaAds)}>
          <SelectTrigger className="h-9 w-32 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="meta">Meta Ads</SelectItem>
            <SelectItem value="google">Google Ads</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">ID da conta</span>
        <Input className="h-9 w-48" value={contaId} onChange={(e) => setContaId(e.target.value)} placeholder="act_123456789" />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Nome (opcional)</span>
        <Input className="h-9 w-48" value={nome} onChange={(e) => setNome(e.target.value)} />
      </div>
      <Button size="sm" onClick={handleConectar} disabled={isPending || !contaId.trim()}>{isPending ? "Conectando..." : "Conectar"}</Button>
      {erro && <p className="w-full text-xs text-danger">{erro}</p>}
    </div>
  );
}
