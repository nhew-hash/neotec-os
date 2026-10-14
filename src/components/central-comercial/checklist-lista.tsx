"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { atualizarTarefaAction } from "@/services/central-comercial/central-comercial.actions";
import type { TarefaChecklist } from "@/services/central-comercial/central-comercial.service";

function Linha({ t }: { t: TarefaChecklist }) {
  const router = useRouter();
  const [pendente, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const concluida = t.status === "concluida";
  const atrasada = !concluida && new Date(t.prazo).getTime() < Date.now();
  return (
    <li className="flex items-start gap-3 py-2">
      <input
        type="checkbox" id={`t-${t.id}`} className="mt-1 h-4 w-4" checked={concluida} disabled={pendente}
        onChange={(e) => { setErro(null); start(async () => { const r = await atualizarTarefaAction(t.id, e.target.checked, t.observacao ?? ""); if (!r.success) setErro(r.error); else router.refresh(); }); }}
      />
      <label htmlFor={`t-${t.id}`} className="flex flex-1 flex-col text-sm">
        <span className={concluida ? "text-muted-foreground line-through" : "font-medium"}>{t.titulo}</span>
        {t.descricao && <span className="text-xs text-muted-foreground">{t.descricao}</span>}
        {erro && <span role="alert" className="text-xs text-danger">{erro}</span>}
      </label>
      <span className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
        até {new Date(t.prazo).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}
        {concluida ? <StatusBadge label="Feita" tone="success" /> : atrasada ? <StatusBadge label="Atrasada" tone="danger" /> : null}
      </span>
    </li>
  );
}

export function ChecklistLista({ tarefas }: { tarefas: TarefaChecklist[] }) {
  if (tarefas.length === 0) return <Card className="p-4 text-sm text-muted-foreground">Nenhuma tarefa para hoje. O gerente cadastra as tarefas da rotina em Gerência.</Card>;
  return <Card className="px-4 py-2"><ul className="divide-y divide-border">{tarefas.map((t) => <Linha key={t.id} t={t} />)}</ul></Card>;
}
