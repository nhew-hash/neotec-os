"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { produtoSchema, type ProdutoFormValues } from "@/services/estoque/estoque.schema";
import { criarProdutoAction } from "@/services/estoque/estoque.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const CATEGORIAS = [
  { value: "iphone", label: "iPhone" },
  { value: "android", label: "Android" },
  { value: "apple_watch", label: "Apple Watch" },
  { value: "ipad", label: "iPad" },
  { value: "acessorio", label: "Acessório" },
  { value: "peca", label: "Peça" },
] as const;

export function ProdutoForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const form = useForm<ProdutoFormValues>({
    resolver: zodResolver(produtoSchema),
    defaultValues: { categoria: "acessorio", marca: "", modelo: "", nome: "", descricao: "" },
  });

  function onSubmit(values: ProdutoFormValues) {
    setErro(null);
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => formData.set(key, String(value ?? "")));

    startTransition(async () => {
      const result = await criarProdutoAction(formData);
      if (!result.success) return setErro(result.error);
      router.push("/estoque");
      router.refresh();
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <FormField
          control={form.control}
          name="categoria"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoria</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {CATEGORIAS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField control={form.control} name="nome" render={({ field }) => (
          <FormItem>
            <FormLabel>Nome</FormLabel>
            <FormControl><Input placeholder="Ex: iPhone 15 Pro 256GB" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid grid-cols-2 gap-5">
          <FormField control={form.control} name="marca" render={({ field }) => (
            <FormItem>
              <FormLabel>Marca (opcional)</FormLabel>
              <FormControl><Input placeholder="Apple" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="modelo" render={({ field }) => (
            <FormItem>
              <FormLabel>Modelo (opcional)</FormLabel>
              <FormControl><Input placeholder="A3108" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid grid-cols-2 gap-5">
          <FormField control={form.control} name="custo" render={({ field }) => (
            <FormItem>
              <FormLabel>Custo</FormLabel>
              <FormControl><Input type="number" step="0.01" placeholder="0,00" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="preco_venda" render={({ field }) => (
            <FormItem>
              <FormLabel>Preço de venda</FormLabel>
              <FormControl><Input type="number" step="0.01" placeholder="0,00" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        {erro && <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{erro}</p>}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.push("/estoque")}>Cancelar</Button>
          <Button type="submit" disabled={isPending}>{isPending ? "Salvando..." : "Salvar produto"}</Button>
        </div>
      </form>
    </Form>
  );
}
