"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ordemServicoSchema, type OrdemServicoFormValues } from "@/services/assistencia/assistencia.schema";
import { criarOSAction } from "@/services/assistencia/assistencia.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { Cliente } from "@/types";
import type { AparelhoComProduto } from "@/services/estoque/estoque.service";

export function OrdemServicoForm({ clientes, aparelhos }: { clientes: Cliente[]; aparelhos: AparelhoComProduto[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const form = useForm<OrdemServicoFormValues>({
    resolver: zodResolver(ordemServicoSchema),
    defaultValues: { cliente_id: "", aparelho_id: "", defeito: "", prazo: "", urgente: false },
  });

  function onSubmit(values: OrdemServicoFormValues) {
    setErro(null);
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (typeof value === "boolean") {
        if (value) formData.set(key, "on");
      } else {
        formData.set(key, String(value ?? ""));
      }
    });

    startTransition(async () => {
      const result = await criarOSAction(formData);
      if (!result.success) return setErro(result.error);
      router.push(`/assistencia/${result.data.id}`);
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
              <SelectContent>{clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="aparelho_id" render={({ field }) => (
          <FormItem>
            <FormLabel>Aparelho (opcional, se já cadastrado no estoque)</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger></FormControl>
              <SelectContent>
                {aparelhos.map((a) => <SelectItem key={a.id} value={a.id}>{a.produto?.nome} — {a.imei}</SelectItem>)}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="defeito" render={({ field }) => (
          <FormItem>
            <FormLabel>Defeito relatado</FormLabel>
            <FormControl><Textarea placeholder="Ex: Sem imagem, tela não liga" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="garantia_dias" render={({ field }) => (
          <FormItem>
            <FormLabel>Garantia do serviço, em dias (opcional)</FormLabel>
            <FormControl><Input type="number" placeholder="90" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid grid-cols-2 gap-5">
          <FormField control={form.control} name="prazo" render={({ field }) => (
            <FormItem>
              <FormLabel>Prazo de entrega (opcional)</FormLabel>
              <FormControl><Input type="date" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="urgente" render={({ field }) => (
            <FormItem className="flex flex-row items-end gap-2 space-y-0 pb-2.5">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormLabel className="!mt-0">Urgente</FormLabel>
            </FormItem>
          )} />
        </div>

        {erro && <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{erro}</p>}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.push("/assistencia")}>Cancelar</Button>
          <Button type="submit" disabled={isPending}>{isPending ? "Abrindo..." : "Abrir OS"}</Button>
        </div>
      </form>
    </Form>
  );
}
