"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { criarCardAction, concluirFollowupAction } from "@/services/crm-pipeline/crm-pipeline.actions";
import { formatDateTime } from "@/utils";
import type { Cliente, CrmEtapa, CrmFollowup, CrmCard } from "@/types";

export function NovaOportunidadeForm({ clientes, etapas }: { clientes: Cliente[]; etapas: CrmEtapa[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const result = await criarCardAction(formData);
      if (!result.success) return setErro(result.error);
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-3">
      <Select name="cliente_id">
        <SelectTrigger><SelectValue placeholder="Cliente" /></SelectTrigger>
        <SelectContent>{clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
      </Select>
      <Select name="etapa_id" defaultValue={etapas[0]?.id}>
        <SelectTrigger><SelectValue placeholder="Etapa inicial" /></SelectTrigger>
        <SelectContent>{etapas.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}</SelectContent>
      </Select>
      <Input name="titulo" placeholder="Ex: Interesse em iPhone 15 Pro" />
      <Input name="valor_estimado" type="number" step="0.01" placeholder="Valor estimado (opcional)" />
      {erro && <p className="text-xs text-danger">{erro}</p>}
      <Button type="submit" size="sm" disabled={isPending}>{isPending ? "Salvando..." : "Criar oportunidade"}</Button>
    </form>
  );
}

export function FollowupsPendentesList({ followups }: { followups: (CrmFollowup & { card: Pick<CrmCard, "id" | "titulo"> })[] }) {
  const [isPending, startTransition] = useTransition();

  if (followups.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum follow-up pendente.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {followups.map((f) => (
        <div key={f.id} className="flex items-center justify-between rounded-md border border-border p-2 text-sm">
          <div className="flex flex-col">
            <span className="text-foreground">{f.motivo}</span>
            <span className="text-xs text-muted-foreground">{formatDateTime(f.data_agendada)}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={() => startTransition(() => concluirFollowupAction(f.id))}
          >
            <CheckCircle2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
