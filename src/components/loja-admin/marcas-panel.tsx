"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { criarMarcaAction, removerMarcaAction } from "@/services/loja-admin/central-loja.actions";
import type { Marca } from "@/types";

export function MarcasPanel({ marcas }: { marcas: Marca[] }) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function handleAdicionar() {
    setErro(null);
    if (!nome.trim()) return;
    startTransition(async () => {
      const result = await criarMarcaAction(nome.trim());
      if (!result.success) return setErro(result.error);
      setNome("");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Input placeholder="Nome da marca (ex: Apple, Samsung, Xiaomi)" value={nome} onChange={(e) => setNome(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAdicionar()} />
        <Button onClick={handleAdicionar} disabled={isPending}><Plus className="h-4 w-4" />Adicionar</Button>
      </div>
      {erro && <p className="text-xs text-danger">{erro}</p>}
      <div className="flex flex-wrap gap-2">
        {marcas.map((m) => (
          <Badge key={m.id} variant="secondary" className="flex items-center gap-1.5 py-1.5 pl-3 pr-2">
            {m.nome}
            <button type="button" onClick={() => startTransition(async () => { await removerMarcaAction(m.id); router.refresh(); })}>
              <Trash2 className="h-3 w-3 text-danger" />
            </button>
          </Badge>
        ))}
        {marcas.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma marca cadastrada ainda.</p>}
      </div>
    </div>
  );
}
