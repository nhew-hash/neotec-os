"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { lancamentoSchema, type LancamentoFormValues } from "@/services/financeiro/financeiro.schema";
import { criarLancamentoAction } from "@/services/financeiro/financeiro.actions";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { formatCurrency, formatDateTime } from "@/utils";
import type { LancamentoFinanceiro } from "@/types";
import type { ResumoFinanceiro } from "@/services/financeiro/financeiro.service";

export function ResumoFinanceiroCards({ resumo }: { resumo: ResumoFinanceiro }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card>
        <CardContent className="flex items-center justify-between p-5">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Entradas</p>
            <p className="font-display text-xl font-semibold text-foreground">{formatCurrency(resumo.entradas)}</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-success-soft text-success"><TrendingUp className="h-[18px] w-[18px]" /></div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center justify-between p-5">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Saídas</p>
            <p className="font-display text-xl font-semibold text-foreground">{formatCurrency(resumo.saidas)}</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-danger-soft text-danger"><TrendingDown className="h-[18px] w-[18px]" /></div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center justify-between p-5">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Saldo</p>
            <p className="font-display text-xl font-semibold text-foreground">{formatCurrency(resumo.saldo)}</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary"><Wallet className="h-[18px] w-[18px]" /></div>
        </CardContent>
      </Card>
    </div>
  );
}

export function LancamentosTable({ lancamentos }: { lancamentos: LancamentoFinanceiro[] }) {
  if (lancamentos.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
        Nenhum lançamento neste período.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Categoria</TableHead>
          <TableHead>Origem</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Valor</TableHead>
          <TableHead>Data</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {lancamentos.map((l) => (
          <TableRow key={l.id}>
            <TableCell className="font-medium text-foreground">{l.categoria}</TableCell>
            <TableCell className="text-xs text-muted-foreground">{l.origem_tipo}</TableCell>
            <TableCell>
              <StatusBadge label={l.tipo === "entrada" ? "Entrada" : "Saída"} tone={l.tipo === "entrada" ? "success" : "danger"} />
            </TableCell>
            <TableCell>{formatCurrency(l.valor)}</TableCell>
            <TableCell className="text-xs text-muted-foreground">{formatDateTime(l.data)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function LancamentoForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const form = useForm<LancamentoFormValues>({
    resolver: zodResolver(lancamentoSchema),
    defaultValues: { tipo: "saida", categoria: "", valor: 0, descricao: "" },
  });

  function onSubmit(values: LancamentoFormValues) {
    setErro(null);
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => formData.set(key, String(value ?? "")));

    startTransition(async () => {
      const result = await criarLancamentoAction(formData);
      if (!result.success) return setErro(result.error);
      form.reset();
      router.refresh();
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField control={form.control} name="tipo" render={({ field }) => (
          <FormItem>
            <FormLabel>Tipo</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="saida">Saída</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="categoria" render={({ field }) => (
          <FormItem>
            <FormLabel>Categoria</FormLabel>
            <FormControl><Input placeholder="Ex: Aluguel, Fornecedor" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="valor" render={({ field }) => (
          <FormItem>
            <FormLabel>Valor</FormLabel>
            <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="descricao" render={({ field }) => (
          <FormItem>
            <FormLabel>Descrição (opcional)</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        {erro && <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{erro}</p>}
        <Button type="submit" disabled={isPending} className="self-end">
          {isPending ? "Salvando..." : "Registrar lançamento"}
        </Button>
      </form>
    </Form>
  );
}
