"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { criarConsignacaoAction, atualizarStatusConsignacaoAction } from "@/services/consignacao/consignacao.actions";
import { formatCurrency, formatDate, formatWhatsapp } from "@/utils";
import type { StatusConsignacao, Cliente } from "@/types";
import type { ConsignacaoComDetalhes } from "@/services/consignacao/consignacao.service";
import type { AparelhoComProduto } from "@/services/estoque/estoque.service";

const STATUS_OPTIONS: { value: StatusConsignacao; label: string }[] = [
  { value: "aguardando", label: "Aguardando" },
  { value: "vendido", label: "Vendido" },
  { value: "devolvido", label: "Devolvido" },
];

export function ConsignacoesTable({ consignacoes }: { consignacoes: ConsignacaoComDetalhes[] }) {
  const [isPending, startTransition] = useTransition();

  if (consignacoes.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
        Nenhuma consignação registrada ainda.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Proprietário</TableHead>
          <TableHead>Valor combinado</TableHead>
          <TableHead>Prazo</TableHead>
          <TableHead>Lucro da loja</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {consignacoes.map((c) => (
          <TableRow key={c.id}>
            <TableCell>
              <div className="flex flex-col">
                <span className="font-medium text-foreground">{c.cliente.nome}</span>
                <span className="font-mono text-xs text-muted-foreground">{formatWhatsapp(c.cliente.whatsapp)}</span>
              </div>
            </TableCell>
            <TableCell>{formatCurrency(c.valor_combinado)}</TableCell>
            <TableCell className="text-xs text-muted-foreground">{c.prazo ? formatDate(c.prazo) : "—"}</TableCell>
            <TableCell className={c.lucro != null ? (c.lucro >= 0 ? "text-success" : "text-danger") : "text-muted-foreground"}>
              {c.lucro != null ? formatCurrency(c.lucro) : "—"}
            </TableCell>
            <TableCell>
              <Select
                defaultValue={c.status}
                disabled={isPending}
                onValueChange={(status) => startTransition(() => atualizarStatusConsignacaoAction(c.id, status as StatusConsignacao))}
              >
                <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function NovaConsignacaoForm({ clientes, aparelhos }: { clientes: Cliente[]; aparelhos: AparelhoComProduto[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const result = await criarConsignacaoAction(formData);
      if (!result.success) return setErro(result.error);
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-3">
      <Select name="cliente_id">
        <SelectTrigger><SelectValue placeholder="Proprietário (cliente)" /></SelectTrigger>
        <SelectContent>{clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
      </Select>
      <Select name="aparelho_id">
        <SelectTrigger><SelectValue placeholder="Aparelho" /></SelectTrigger>
        <SelectContent>
          {aparelhos.map((a) => <SelectItem key={a.id} value={a.id}>{a.produto?.nome} — {a.imei}</SelectItem>)}
        </SelectContent>
      </Select>
      <Input name="valor_combinado" type="number" step="0.01" placeholder="Valor combinado com o proprietário" />
      <Input name="prazo" type="date" />
      {erro && <p className="text-xs text-danger">{erro}</p>}
      <Button type="submit" size="sm" disabled={isPending}>{isPending ? "Salvando..." : "Registrar consignação"}</Button>
    </form>
  );
}
