"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { orcamentoSchema, type OrcamentoFormValues } from "@/services/vendas/vendas.schema";
import { criarOrcamentoAction } from "@/services/vendas/vendas.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { Cliente, Produto } from "@/types";
import type { AparelhoComProduto } from "@/services/estoque/estoque.service";

const FORMAS_PAGAMENTO = [
  { value: "pix", label: "Pix" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao_credito", label: "Cartão de crédito" },
  { value: "cartao_debito", label: "Cartão de débito" },
  { value: "boleto", label: "Boleto" },
  { value: "misto", label: "Misto" },
] as const;

interface OrcamentoFormProps {
  clientes: Cliente[];
  produtos: Produto[];
  aparelhos: AparelhoComProduto[];
  clienteIdInicial?: string;
}

export function OrcamentoForm({ clientes, produtos, aparelhos, clienteIdInicial }: OrcamentoFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [tipoItem, setTipoItem] = useState<"aparelho" | "produto">("aparelho");

  const form = useForm<OrcamentoFormValues>({
    resolver: zodResolver(orcamentoSchema),
    defaultValues: { cliente_id: clienteIdInicial ?? "", produto_id: "", aparelho_id: "", valor: 0 },
  });

  const aparelhosDisponiveis = aparelhos.filter((a) => a.status === "disponivel");

  function onSubmit(values: OrcamentoFormValues) {
    setErro(null);
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => formData.set(key, String(value ?? "")));

    startTransition(async () => {
      const result = await criarOrcamentoAction(formData);
      if (!result.success) return setErro(result.error);
      router.push("/vendas");
      router.refresh();
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <FormField control={form.control} name="cliente_id" render={({ field }) => (
          <FormItem>
            <FormLabel>Cliente</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger></FormControl>
              <SelectContent>
                {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        <div className="flex gap-2">
          <Button type="button" size="sm" variant={tipoItem === "aparelho" ? "default" : "outline"} onClick={() => setTipoItem("aparelho")}>
            Aparelho do estoque
          </Button>
          <Button type="button" size="sm" variant={tipoItem === "produto" ? "default" : "outline"} onClick={() => setTipoItem("produto")}>
            Produto/acessório
          </Button>
        </div>

        {tipoItem === "aparelho" ? (
          <FormField control={form.control} name="aparelho_id" render={({ field }) => (
            <FormItem>
              <FormLabel>Aparelho</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Selecione um aparelho disponível" /></SelectTrigger></FormControl>
                <SelectContent>
                  {aparelhosDisponiveis.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.produto?.nome} — {a.imei}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        ) : (
          <FormField control={form.control} name="produto_id" render={({ field }) => (
            <FormItem>
              <FormLabel>Produto</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Selecione um produto" /></SelectTrigger></FormControl>
                <SelectContent>
                  {produtos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        )}

        <div className="grid grid-cols-2 gap-5">
          <FormField control={form.control} name="valor" render={({ field }) => (
            <FormItem>
              <FormLabel>Valor</FormLabel>
              <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="forma_pagamento" render={({ field }) => (
            <FormItem>
              <FormLabel>Forma de pagamento</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                <SelectContent>
                  {FORMAS_PAGAMENTO.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid grid-cols-2 gap-5">
          <FormField control={form.control} name="garantia_dias" render={({ field }) => (
            <FormItem>
              <FormLabel>Garantia (dias)</FormLabel>
              <FormControl><Input type="number" placeholder="90" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="validade" render={({ field }) => (
            <FormItem>
              <FormLabel>Validade do orçamento</FormLabel>
              <FormControl><Input type="date" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        {erro && <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{erro}</p>}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.push("/vendas")}>Cancelar</Button>
          <Button type="submit" disabled={isPending}>{isPending ? "Salvando..." : "Criar orçamento"}</Button>
        </div>
      </form>
    </Form>
  );
}
