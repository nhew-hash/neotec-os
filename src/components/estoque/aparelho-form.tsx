"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { aparelhoSchema, type AparelhoFormValues } from "@/services/estoque/estoque.schema";
import { criarAparelhoAction } from "@/services/estoque/estoque.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { Produto } from "@/types";

const CONDICOES = [
  { value: "novo", label: "Novo" },
  { value: "seminovo", label: "Seminovo" },
  { value: "usado", label: "Usado" },
] as const;

const ORIGENS_ENTRADA = [
  { value: "fornecedor", label: "Fornecedor" },
  { value: "cliente", label: "Cliente" },
  { value: "troca", label: "Troca" },
  { value: "compra", label: "Compra" },
  { value: "consignacao", label: "Consignação" },
  { value: "investidor", label: "Investidor" },
  { value: "marketplace", label: "Marketplace" },
  { value: "leilao", label: "Leilão" },
] as const;

export function AparelhoForm({ produtos }: { produtos: Produto[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const form = useForm<AparelhoFormValues>({
    resolver: zodResolver(aparelhoSchema),
    defaultValues: {
      produto_id: "", imei: "", numero_serie: "", cor: "", memoria: "",
      condicao: "seminovo", origem_entrada: "fornecedor", fornecedor: "",
    },
  });

  function onSubmit(values: AparelhoFormValues) {
    setErro(null);
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => formData.set(key, String(value ?? "")));

    startTransition(async () => {
      const result = await criarAparelhoAction(formData);
      if (!result.success) return setErro(result.error);
      router.push("/estoque");
      router.refresh();
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <FormField control={form.control} name="produto_id" render={({ field }) => (
          <FormItem>
            <FormLabel>Modelo do catálogo</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Selecione um produto" /></SelectTrigger></FormControl>
              <SelectContent>
                {produtos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="imei" render={({ field }) => (
          <FormItem>
            <FormLabel>IMEI</FormLabel>
            <FormControl><Input className="font-mono" placeholder="15 dígitos" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid grid-cols-2 gap-5">
          <FormField control={form.control} name="cor" render={({ field }) => (
            <FormItem>
              <FormLabel>Cor (opcional)</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="memoria" render={({ field }) => (
            <FormItem>
              <FormLabel>Memória (opcional)</FormLabel>
              <FormControl><Input placeholder="256GB" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid grid-cols-2 gap-5">
          <FormField control={form.control} name="condicao" render={({ field }) => (
            <FormItem>
              <FormLabel>Condição</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  {CONDICOES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="bateria" render={({ field }) => (
            <FormItem>
              <FormLabel>Bateria % (opcional)</FormLabel>
              <FormControl><Input type="number" min={0} max={100} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid grid-cols-2 gap-5">
          <FormField control={form.control} name="custo" render={({ field }) => (
            <FormItem>
              <FormLabel>Custo</FormLabel>
              <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="preco_venda" render={({ field }) => (
            <FormItem>
              <FormLabel>Preço de venda</FormLabel>
              <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid grid-cols-2 gap-5">
          <FormField control={form.control} name="preco_minimo" render={({ field }) => (
            <FormItem>
              <FormLabel>Preço mínimo (opcional)</FormLabel>
              <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="preco_sugerido" render={({ field }) => (
            <FormItem>
              <FormLabel>Preço sugerido (opcional)</FormLabel>
              <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid grid-cols-2 gap-5">
          <FormField control={form.control} name="origem_entrada" render={({ field }) => (
            <FormItem>
              <FormLabel>Origem de entrada</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  {ORIGENS_ENTRADA.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="fornecedor" render={({ field }) => (
            <FormItem>
              <FormLabel>Fornecedor (opcional)</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        {erro && <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{erro}</p>}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.push("/estoque")}>Cancelar</Button>
          <Button type="submit" disabled={isPending}>{isPending ? "Salvando..." : "Cadastrar aparelho"}</Button>
        </div>
      </form>
    </Form>
  );
}
