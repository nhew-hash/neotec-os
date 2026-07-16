"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Plus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { criarCardAction, concluirFollowupAction } from "@/services/crm-pipeline/crm-pipeline.actions";
import { concluirRetornoAction } from "@/services/crm/crm.actions";
import { formatDateTime } from "@/utils";
import { cn } from "@/lib/utils";
import { categorizarFollowups, type ItemFollowupUnificado } from "@/utils/followups";
import type { Cliente, CrmEtapa, CrmFollowup, CrmCard } from "@/types";
import type { RetornoComCliente } from "@/services/crm/crm.service";

// ---- Nova oportunidade — botão de destaque + painel lateral ----

export function NovaOportunidadeButton({ clientes, etapas }: { clientes: Cliente[]; etapas: CrmEtapa[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const result = await criarCardAction(formData);
      if (!result.success) return setErro(result.error);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="lg" className="shadow-card-hover">
          <Plus className="h-4 w-4" />
          Nova oportunidade
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex flex-col gap-4 p-6">
        <h2 className="font-display text-lg font-semibold text-foreground">Nova oportunidade</h2>
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
          <Button type="submit" disabled={isPending}>{isPending ? "Salvando..." : "Criar oportunidade"}</Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// ---- Follow-ups — hoje / atrasados / próximos, com badge de urgência ----

interface FollowupsPanelProps {
  followups: (CrmFollowup & { card: Pick<CrmCard, "id" | "titulo"> })[];
  retornos: RetornoComCliente[];
}

export function FollowupsPanel({ followups, retornos }: FollowupsPanelProps) {
  const [isPending, startTransition] = useTransition();
  const itens = categorizarFollowups(followups, retornos);

  const atrasados = itens.filter((i) => i.categoria === "atrasado");
  const hoje = itens.filter((i) => i.categoria === "hoje");
  const futuros = itens.filter((i) => i.categoria === "futuro");

  function handleConcluir(item: ItemFollowupUnificado) {
    startTransition(() => {
      if (item.tipo === "followup") void concluirFollowupAction(item.id);
      else void concluirRetornoAction(item.id);
    });
  }

  function Grupo({ titulo, dados, destaque }: { titulo: string; dados: ItemFollowupUnificado[]; destaque?: boolean }) {
    if (dados.length === 0) return null;
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          {destaque && <AlertTriangle className="h-3.5 w-3.5 text-danger" />}
          <h3 className={cn("text-xs font-semibold uppercase tracking-wide", destaque ? "text-danger" : "text-muted-foreground")}>
            {titulo} ({dados.length})
          </h3>
        </div>
        {dados.map((item) => (
          <div
            key={`${item.tipo}-${item.id}`}
            className={cn(
              "flex items-center justify-between rounded-md border p-2.5 text-sm",
              destaque ? "border-danger/30 bg-danger-soft" : "border-border"
            )}
          >
            <div className="flex flex-col">
              <span className="text-foreground">{item.titulo}</span>
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

  if (itens.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
        Nenhum follow-up pendente. Tudo em dia.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Grupo titulo="Atrasados" dados={atrasados} destaque />
      <Grupo titulo="Hoje" dados={hoje} />
      <Grupo titulo="Próximos" dados={futuros} />
    </div>
  );
}
