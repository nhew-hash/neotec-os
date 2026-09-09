"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { apagarAparelhoAction } from "@/services/estoque/estoque.actions";
import { Button } from "@/components/ui/button";

export function ApagarAparelhoButton({ aparelhoId }: { aparelhoId: string }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [apagando, setApagando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleApagar() {
    setApagando(true);
    setErro(null);
    const result = await apagarAparelhoAction(aparelhoId);
    setApagando(false);
    if (!result.success) return setErro(result.error);
    router.push("/estoque");
  }

  if (!confirmando) {
    return (
      <Button variant="outline" className="border-danger/40 text-danger hover:bg-danger/5" onClick={() => setConfirmando(true)}>
        <Trash2 className="h-4 w-4" />Apagar aparelho
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-danger/40 bg-danger/5 p-3">
      <p className="text-xs text-foreground">Isso apaga o aparelho de verdade, sem volta. Confirma?</p>
      {erro && <p className="text-xs text-danger">{erro}</p>}
      <div className="flex gap-2">
        <Button size="sm" variant="destructive" onClick={handleApagar} disabled={apagando}>
          {apagando ? "Apagando..." : "Sim, apagar"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirmando(false)}>Cancelar</Button>
      </div>
    </div>
  );
}
