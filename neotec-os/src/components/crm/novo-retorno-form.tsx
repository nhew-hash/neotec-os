"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { crmFollowupSchema, type CrmFollowupFormValues } from "@/services/crm-pipeline/crm-pipeline.schema";
import { criarFollowupAction } from "@/services/crm-pipeline/crm-pipeline.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { Cliente } from "@/types";

/** Fase 179 — unificado com o sistema de follow-up do CRM (antes era uma tabela "retornos" à parte). Vincula pelo cliente direto, sem precisar escolher um card. */
export function NovoRetornoForm({ clientes }: { clientes: Cliente[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const form = useForm<CrmFollowupFormValues>({
    resolver: zodResolver(crmFollowupSchema),
    defaultValues: { cliente_id: "", card_id: "", data_agendada: "", motivo: "" },
  });

  function onSubmit(values: CrmFollowupFormValues) {
    setErro(null);
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => formData.set(key, value ?? ""));

    startTransition(async () => {
      const result = await criarFollowupAction(formData);
      if (!result.success) {
        setErro(result.error);
        return;
      }
      form.reset();
      router.refresh();
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="cliente_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cliente</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="data_agendada"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data do retorno</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="motivo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Motivo</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Retornar sobre o iPhone 15 Pro" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {erro && <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{erro}</p>}

        <Button type="submit" disabled={isPending} className="self-end">
          {isPending ? "Agendando..." : "Agendar retorno"}
        </Button>
      </form>
    </Form>
  );
}
