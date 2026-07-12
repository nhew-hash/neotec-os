"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { aprovarOrcamentoAction } from "@/services/vendas/vendas.actions";
import { formatCurrency, formatDate } from "@/utils";
import type { StatusOrcamento } from "@/types";
import type { OrcamentoComCliente } from "@/services/vendas/vendas.service";

const STATUS_CONFIG: Record<StatusOrcamento, { label: string; variant: "default" | "success" | "warning" | "danger" | "secondary" }> = {
  criado: { label: "Criado", variant: "secondary" },
  enviado: { label: "Enviado", variant: "default" },
  visualizado: { label: "Visualizado", variant: "default" },
  aprovado: { label: "Aprovado", variant: "success" },
  recusado: { label: "Recusado", variant: "danger" },
  expirado: { label: "Expirado", variant: "secondary" },
};

export function OrcamentosTable({ orcamentos }: { orcamentos: OrcamentoComCliente[] }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (orcamentos.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
        Nenhum orçamento criado ainda.
      </div>
    );
  }

  function handleAprovar(id: string) {
    startTransition(async () => {
      const result = await aprovarOrcamentoAction(id);
      if (result.success) router.push(`/vendas/${result.data.vendaId}`);
    });
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Cliente</TableHead>
          <TableHead>Valor</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Criado em</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {orcamentos.map((orcamento) => (
          <TableRow key={orcamento.id}>
            <TableCell className="font-medium text-foreground">{orcamento.cliente.nome}</TableCell>
            <TableCell>{formatCurrency(orcamento.valor)}</TableCell>
            <TableCell><Badge variant={STATUS_CONFIG[orcamento.status].variant}>{STATUS_CONFIG[orcamento.status].label}</Badge></TableCell>
            <TableCell className="text-xs text-muted-foreground">{formatDate(orcamento.data_criacao)}</TableCell>
            <TableCell>
              {orcamento.status !== "aprovado" && (
                <Button size="sm" disabled={isPending} onClick={() => handleAprovar(orcamento.id)}>
                  Aprovar e gerar venda
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
