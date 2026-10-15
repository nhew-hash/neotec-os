"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Plus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ClienteBusca } from "@/components/central-comercial/cliente-busca";
import type { ClienteResultado } from "@/services/central-comercial/clientes-busca.service";
import { criarCardAction, concluirFollowupAction } from "@/services/crm-pipeline/crm-pipeline.actions";
import { formatDateTime } from "@/utils";
import { cn } from "@/lib/utils";
import { categorizarFollowups, type ItemFollowupUnificado } from "@/utils/followups";
import type { Cliente, CrmEtapa, CrmFollowup, CrmCard } from "@/types";

// ---- Nova oportunidade — botão de destaque + painel lateral ----

/**
 * O cliente é escolhido pela mesma busca no servidor da Central Comercial
 * (nome/telefone, com cadastro rápido e checagem de duplicidade). Antes era
 * um <Select> com TODOS os clientes da base — inutilizável com centenas de
 * cadastros, e obrigava a página do CRM a baixar a base inteira.
 */
export function NovaOportunidadeButton({ etapas }: { etapas: CrmEtapa[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [cliente, setCliente] = useState<ClienteResultado | null>(null);
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setErro(null);
    if (!cliente) return setErro("Escolha o cliente.");
    formData.set("cliente_id", cliente.id);
    startTransition(async () => {
      const result = await criarCardAction(formData);
      if (!result.success) return setErro(result.error);
      setOpen(false);
      setCliente(null);
      router.refresh();
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm">
          <Plus aria-hidden />
          Nova oportunidade
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col gap-4 overflow-y-auto p-6 sm:max-w-md">
        <SheetTitle className="text-lg">Nova oportunidade</SheetTitle>
        <form action={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Cliente</span>
            <ClienteBusca cliente={cliente} onSelecionar={setCliente} />
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Etapa inicial</span>
            <Select name="etapa_id" defaultValue={etapas[0]?.id}>
              <SelectTrigger><SelectValue placeholder="Etapa inicial" /></SelectTrigger>
              <SelectContent>{etapas.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}</SelectContent>
            </Select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">O que o cliente procura</span>
            <Input name="titulo" placeholder="Ex.: iPhone 15 Pro 256GB, troca do 12" required />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Valor estimado (opcional)</span>
            <Input name="valor_estimado" type="number" step="0.01" min="0" inputMode="decimal" placeholder="0,00" />
          </label>
          {erro && <p className="text-xs text-danger" role="alert">{erro}</p>}
          <Button type="submit" loading={isPending} loadingText="Salvando…">Criar oportunidade</Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// ---- Follow-ups — hoje / atrasados / próximos, com badge de urgência ----

interface FollowupsPanelProps {
  followups: (CrmFollowup & { card: Pick<CrmCard, "id" | "titulo"> | null; cliente: Pick<Cliente, "id" | "nome"> | null })[];
}

export function FollowupsPanel({ followups }: FollowupsPanelProps) {
  const [isPending, startTransition] = useTransition();
  const itens = categorizarFollowups(followups);

  const atrasados = itens.filter((i) => i.categoria === "atrasado");
  const hoje = itens.filter((i) => i.categoria === "hoje");
  const futuros = itens.filter((i) => i.categoria === "futuro");

  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  function handleConcluir(item: ItemFollowupUnificado) {
    setErro(null);
    startTransition(async () => {
      const r = await concluirFollowupAction(item.id);
      if (!r.success) setErro(r.error);
      else router.refresh();
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
            <Button variant="ghost" size="sm" disabled={isPending} onClick={() => handleConcluir(item)} aria-label="Marcar como feito" title="Marcar como feito">
              <CheckCircle2 className="h-4 w-4" />Feito
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
      {erro && <p className="text-xs text-danger" role="alert">{erro}</p>}
      <Grupo titulo="Atrasados" dados={atrasados} destaque />
      <Grupo titulo="Hoje" dados={hoje} />
      <Grupo titulo="Próximos" dados={futuros} />
    </div>
  );
}
