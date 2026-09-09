"use client";

import { useState, useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { atualizarChecklistEntregaAction } from "@/services/vendas/vendas.actions";

interface ChecklistEntregaProps {
  vendaId: string;
  inicial: {
    checklist_aparelho_conferido: boolean;
    checklist_acessorios_recebidos: boolean;
    checklist_garantia_entregue: boolean;
    checklist_cliente_confirmou: boolean;
  };
}

const ITENS = [
  { key: "checklist_aparelho_conferido", label: "Conferiu aparelho" },
  { key: "checklist_acessorios_recebidos", label: "Recebeu acessórios" },
  { key: "checklist_garantia_entregue", label: "Recebeu garantia" },
  { key: "checklist_cliente_confirmou", label: "Cliente confirmou" },
] as const;

export function ChecklistEntrega({ vendaId, inicial }: ChecklistEntregaProps) {
  const [estado, setEstado] = useState(inicial);
  const [isPending, startTransition] = useTransition();

  function toggle(key: keyof typeof estado) {
    const novoEstado = { ...estado, [key]: !estado[key] };
    setEstado(novoEstado);
    startTransition(() => {
      void atualizarChecklistEntregaAction(vendaId, novoEstado);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {ITENS.map((item) => (
        <label key={item.key} className="flex items-center gap-2 text-sm">
          <Checkbox checked={estado[item.key]} disabled={isPending} onCheckedChange={() => toggle(item.key)} />
          {item.label}
        </label>
      ))}
    </div>
  );
}
