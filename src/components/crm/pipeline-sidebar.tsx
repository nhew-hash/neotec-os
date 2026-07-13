"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { criarCardAction, concluirFollowupAction } from "@/services/crm-pipeline/crm-pipeline.actions";
import { concluirRetornoAction } from "@/services/crm/crm.actions";
import { formatDateTime } from "@/utils";
import { Badge } from "@/components/ui/badge";
import type { Cliente, CrmEtapa, CrmFollowup, CrmCard } from "@/types";
import type { RetornoComCliente } from "@/services/crm/crm.service";

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

interface FollowupsPendentesListProps {
  followups: (CrmFollowup & { card: Pick<CrmCard, "id" | "titulo"> })[];
  retornosHoje: RetornoComCliente[];
}

interface ItemUnificado {
  id: string;
  tipo: "followup" | "retorno";
  titulo: string;
  quando: string;
}

export function FollowupsPendentesList({ followups, retornosHoje }: FollowupsPendentesListProps) {
  const [isPending, startTransition] = useTransition();

  const itens: ItemUnificado[] = [
    ...followups.map((f) => ({ id: f.id, tipo: "followup" as const, titulo: f.motivo, quando: f.data_agendada })),
    ...retornosHoje.map((r) => ({ id: r.id, tipo: "retorno" as const, titulo: `${r.cliente.nome} — ${r.motivo}`, quando: r.data_retorno })),
  ].sort((a, b) => a.quando.localeCompare(b.quando));

  if (itens.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum follow-up pendente, nem retorno pra hoje.</p>;
  }

  function handleConcluir(item: ItemUnificado) {
    startTransition(() => {
      if (item.tipo === "followup") void concluirFollowupAction(item.id);
      else void concluirRetornoAction(item.id);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {itens.map((item) => (
        <div key={`${item.tipo}-${item.id}`} className="flex items-center justify-between rounded-md border border-border p-2 text-sm">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-foreground">{item.titulo}</span>
              {item.tipo === "retorno" && <Badge variant="secondary" className="text-[10px]">Retorno de hoje</Badge>}
            </div>
            <span className="text-xs text-muted-foreground">{formatDateTime(item.quando)}</span>
          </div>
          <Button variant="ghost" size="sm" disabled={isPending} onClick={() => handleConcluir(item)}>
            <CheckCircle2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
