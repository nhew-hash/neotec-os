"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { clienteSchema, type ClienteFormValues } from "@/services/clientes/clientes.schema";
import { criarClienteAction, atualizarClienteAction } from "@/services/clientes/clientes.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { Cliente } from "@/types";

const ORIGENS = [
  { value: "instagram", label: "Instagram" },
  { value: "google", label: "Google" },
  { value: "indicacao", label: "Indicação" },
  { value: "loja_fisica", label: "Loja física" },
  { value: "shopify", label: "Shopify" },
  { value: "outros", label: "Outros" },
] as const;

interface ClienteFormProps {
  cliente?: Cliente;
}

export function ClienteForm({ cliente }: ClienteFormProps) {
  const router = useRouter();
  const isEdicao = Boolean(cliente);
  const [isPending, startTransition] = useTransition();
  const [erroServidor, setErroServidor] = useState<string | null>(null);

  const form = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      nome: cliente?.nome ?? "",
      whatsapp: cliente?.whatsapp ?? "",
      cpf: cliente?.cpf ?? "",
      email: cliente?.email ?? "",
      data_nascimento: cliente?.data_nascimento ?? "",
      apple_id: cliente?.apple_id ?? "",
      endereco: cliente?.endereco ?? "",
      cidade: cliente?.cidade ?? "",
      estado: cliente?.estado ?? "",
      origem: cliente?.origem ?? undefined,
      aceita_marketing: cliente?.aceita_marketing ?? false,
      observacoes: cliente?.observacoes ?? "",
    },
  });

  function onSubmit(values: ClienteFormValues) {
    setErroServidor(null);

    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (typeof value === "boolean") {
        if (value) formData.set(key, "on");
      } else {
        formData.set(key, value ?? "");
      }
    });

    startTransition(async () => {
      const result = isEdicao
        ? await atualizarClienteAction(cliente!.id, formData)
        : await criarClienteAction(formData);

      if (!result.success) {
        setErroServidor(result.error);
        return;
      }

      router.push(isEdicao ? `/clientes/${cliente!.id}` : "/clientes");
      router.refresh();
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <FormField control={form.control} name="nome" render={({ field }) => (
          <FormItem>
            <FormLabel>Nome completo</FormLabel>
            <FormControl><Input placeholder="Ex: João Silva" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="whatsapp" render={({ field }) => (
          <FormItem>
            <FormLabel>WhatsApp</FormLabel>
            <FormControl><Input placeholder="Somente números, com DDD" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <FormField control={form.control} name="cpf" render={({ field }) => (
            <FormItem>
              <FormLabel>CPF (opcional)</FormLabel>
              <FormControl><Input placeholder="000.000.000-00" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="data_nascimento" render={({ field }) => (
            <FormItem>
              <FormLabel>Nascimento (opcional)</FormLabel>
              <FormControl><Input type="date" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail (opcional)</FormLabel>
              <FormControl><Input type="email" placeholder="cliente@email.com" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="apple_id" render={({ field }) => (
            <FormItem>
              <FormLabel>Apple ID (opcional)</FormLabel>
              <FormControl><Input placeholder="cliente@icloud.com" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="endereco" render={({ field }) => (
          <FormItem>
            <FormLabel>Endereço (opcional)</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-[1fr_120px]">
          <FormField control={form.control} name="cidade" render={({ field }) => (
            <FormItem>
              <FormLabel>Cidade (opcional)</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="estado" render={({ field }) => (
            <FormItem>
              <FormLabel>UF</FormLabel>
              <FormControl><Input maxLength={2} placeholder="MG" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="origem" render={({ field }) => (
          <FormItem>
            <FormLabel>Origem (opcional)</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Como o cliente chegou até a Neotec" /></SelectTrigger></FormControl>
              <SelectContent>
                {ORIGENS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="observacoes" render={({ field }) => (
          <FormItem>
            <FormLabel>Observações (opcional)</FormLabel>
            <FormControl><Input placeholder="Preferências, contexto do atendimento..." {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="aceita_marketing" render={({ field }) => (
          <FormItem className="flex flex-row items-center gap-2 space-y-0">
            <FormControl>
              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
            <FormLabel className="!mt-0">Aceita receber comunicação de marketing</FormLabel>
          </FormItem>
        )} />

        {erroServidor && (
          <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{erroServidor}</p>
        )}

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(isEdicao ? `/clientes/${cliente!.id}` : "/clientes")}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Salvando..." : isEdicao ? "Salvar alterações" : "Salvar cliente"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
