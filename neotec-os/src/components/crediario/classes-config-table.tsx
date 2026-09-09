"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { salvarClasseAction } from "@/services/crediario/crediario.actions";

interface Classe {
  id: string; nome: string; score_minimo: number; score_maximo: number; limite_maximo: number;
  entrada_minima_pct: number; prazo_maximo_meses: number; encargos_pct: number; fiador_obrigatorio: boolean;
}

export function ClassesConfigTable({ classes }: { classes: Classe[] }) {
  return (
    <div className="flex flex-col gap-2">
      {classes.map((c) => <LinhaClasse key={c.id} classe={c} />)}
    </div>
  );
}

function LinhaClasse({ classe }: { classe: Classe }) {
  const [editando, setEditando] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    formData.set("id", classe.id);
    startTransition(async () => {
      await salvarClasseAction(formData);
      setEditando(false);
    });
  }

  if (!editando) {
    return (
      <div className="flex items-center justify-between rounded-xl bg-secondary/40 p-2.5 text-xs">
        <span className="font-semibold text-foreground">{classe.nome}</span>
        <span className="text-muted-foreground">Score {classe.score_minimo}-{classe.score_maximo} · Limite R$ {classe.limite_maximo} · Entrada {classe.entrada_minima_pct}% · {classe.prazo_maximo_meses}m · Fiador: {classe.fiador_obrigatorio ? "sim" : "não"}</span>
        <button type="button" onClick={() => setEditando(true)} className="text-primary hover:underline">Editar</button>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="grid grid-cols-3 gap-2 rounded-xl border border-border p-3 text-xs">
      <span className="col-span-3 font-semibold text-foreground">{classe.nome}</span>
      <Input type="number" name="score_minimo" defaultValue={classe.score_minimo} placeholder="Score mín" className="h-8" />
      <Input type="number" name="score_maximo" defaultValue={classe.score_maximo} placeholder="Score máx" className="h-8" />
      <Input type="number" name="limite_maximo" defaultValue={classe.limite_maximo} placeholder="Limite R$" className="h-8" />
      <Input type="number" name="entrada_minima_pct" defaultValue={classe.entrada_minima_pct} placeholder="Entrada %" className="h-8" />
      <Input type="number" name="prazo_maximo_meses" defaultValue={classe.prazo_maximo_meses} placeholder="Prazo (meses)" className="h-8" />
      <Input type="number" name="encargos_pct" defaultValue={classe.encargos_pct} placeholder="Encargos %" className="h-8" />
      <label className="col-span-3 flex items-center gap-1.5"><input type="checkbox" name="fiador_obrigatorio" defaultChecked={classe.fiador_obrigatorio} className="h-3.5 w-3.5 accent-primary" />Fiador obrigatório</label>
      <div className="col-span-3 flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>Salvar</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setEditando(false)}>Cancelar</Button>
      </div>
    </form>
  );
}
