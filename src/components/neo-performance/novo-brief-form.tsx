"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { criarBriefAction } from "@/services/neo-performance/neo-performance-avancado.actions";

export function NovoBriefForm() {
  const [isPending, startTransition] = useTransition();
  const [objetivo, setObjetivo] = useState("");
  const [produto, setProduto] = useState("");
  const [publico, setPublico] = useState("");
  const [hipotese, setHipotese] = useState("");
  const [mensagem, setMensagem] = useState<string | null>(null);

  function handleCriar() {
    if (!objetivo.trim()) return;
    setMensagem(null);
    startTransition(async () => {
      const resultado = await criarBriefAction({ objetivo: objetivo.trim(), produto: produto.trim() || undefined, publico: publico.trim() || undefined, hipotese: hipotese.trim() || undefined });
      if (!resultado.success) { setMensagem(resultado.error); return; }
      setObjetivo(""); setProduto(""); setPublico(""); setHipotese("");
      setMensagem("Brief criado.");
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Input placeholder="Objetivo" value={objetivo} onChange={(e) => setObjetivo(e.target.value)} />
        <Input placeholder="Produto (opcional)" value={produto} onChange={(e) => setProduto(e.target.value)} />
        <Input placeholder="Público (opcional)" value={publico} onChange={(e) => setPublico(e.target.value)} />
        <Input placeholder="Hipótese (opcional)" value={hipotese} onChange={(e) => setHipotese(e.target.value)} />
      </div>
      <Button size="sm" onClick={handleCriar} disabled={isPending || !objetivo.trim()} className="w-fit">Criar brief</Button>
      {mensagem && <p className="text-xs text-muted-foreground">{mensagem}</p>}
    </div>
  );
}
