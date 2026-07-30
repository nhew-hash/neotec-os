"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { apagarAparelhoAction } from "@/services/estoque/estoque.actions";

export function ApagarAparelhoButtonCompacto({ aparelhoId }: { aparelhoId: string }) {
  const [confirmando, setConfirmando] = useState(false);
  const [apagando, setApagando] = useState(false);

  async function handleApagar() {
    setApagando(true);
    await apagarAparelhoAction(aparelhoId);
    // Não navega — a lista se atualiza sozinha via revalidatePath, o
    // item some da tabela na hora.
  }

  if (confirmando) {
    return (
      <div className="flex items-center gap-1">
        <button type="button" onClick={handleApagar} disabled={apagando} className="rounded px-1.5 py-0.5 text-[11px] font-medium text-danger hover:bg-danger/10">
          {apagando ? "..." : "Confirma?"}
        </button>
        <button type="button" onClick={() => setConfirmando(false)} className="text-[11px] text-muted-foreground hover:text-foreground">Não</button>
      </div>
    );
  }

  return (
    <button type="button" onClick={() => setConfirmando(true)} className="rounded p-1 text-muted-foreground hover:bg-danger/10 hover:text-danger" title="Apagar aparelho">
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}
