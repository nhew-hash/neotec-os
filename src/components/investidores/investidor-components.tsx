"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { criarInvestidorAction, registrarMovimentoInvestidorAction } from "@/services/investidores/investidores.actions";
import { formatCurrency } from "@/utils";
import type { InvestidorResumo } from "@/types";

export function InvestidoresTable({ investidores }: { investidores: InvestidorResumo[] }) {
  if (investidores.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
        Nenhum investidor cadastrado ainda.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Capital investido</TableHead>
          <TableHead>Aplicado</TableHead>
          <TableHead>Livre</TableHead>
          <TableHead>Lucro</TableHead>
          <TableHead>Rentabilidade</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {investidores.map((inv) => (
          <TableRow key={inv.investidor_id}>
            <TableCell>
              <Link href={`/investidores/${inv.investidor_id}`} className="font-medium text-foreground hover:underline">
                {inv.nome}
              </Link>
            </TableCell>
            <TableCell>{formatCurrency(inv.capital_investido)}</TableCell>
            <TableCell>{formatCurrency(inv.capital_aplicado)}</TableCell>
            <TableCell>{formatCurrency(inv.capital_livre)}</TableCell>
            <TableCell className={inv.lucro >= 0 ? "text-success" : "text-danger"}>{formatCurrency(inv.lucro)}</TableCell>
            <TableCell>{inv.rentabilidade_pct}%</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function NovoInvestidorForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const result = await criarInvestidorAction(formData);
      if (!result.success) return setErro(result.error);
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-3">
      <Input name="nome" placeholder="Nome do investidor" required />
      <Input name="telefone" placeholder="Telefone (opcional)" />
      <Input name="observacoes" placeholder="Observações (opcional)" />
      {erro && <p className="text-xs text-danger">{erro}</p>}
      <Button type="submit" size="sm" disabled={isPending}>{isPending ? "Salvando..." : "Cadastrar investidor"}</Button>
    </form>
  );
}

export function MovimentoInvestidorForm({ investidorId }: { investidorId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setErro(null);
    formData.set("investidor_id", investidorId);
    startTransition(async () => {
      const result = await registrarMovimentoInvestidorAction(formData);
      if (!result.success) return setErro(result.error);
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Select name="tipo" defaultValue="aporte">
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="aporte">Aporte</SelectItem>
            <SelectItem value="saque">Saque</SelectItem>
          </SelectContent>
        </Select>
        <Input name="valor" type="number" step="0.01" placeholder="Valor" className="flex-1" />
      </div>
      <Input name="observacao" placeholder="Observação (opcional)" />
      {erro && <p className="text-xs text-danger">{erro}</p>}
      <Button type="submit" size="sm" disabled={isPending}>{isPending ? "Salvando..." : "Registrar"}</Button>
    </form>
  );
}

export function ResumoInvestidorCards({ resumo }: { resumo: { capital_investido: number; capital_aplicado: number; capital_livre: number; lucro: number; rentabilidade_pct: number } }) {
  const itens = [
    { label: "Capital investido", value: formatCurrency(resumo.capital_investido) },
    { label: "Capital aplicado", value: formatCurrency(resumo.capital_aplicado) },
    { label: "Capital livre", value: formatCurrency(resumo.capital_livre) },
    { label: "Lucro", value: formatCurrency(resumo.lucro) },
    { label: "Rentabilidade", value: `${resumo.rentabilidade_pct}%` },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {itens.map((item) => (
        <Card key={item.label}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="font-display text-lg font-semibold text-foreground">{item.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
