"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus, Users } from "lucide-react";
import { ordemServicoSchema, type OrdemServicoFormValues } from "@/services/assistencia/assistencia.schema";
import { criarOSAction } from "@/services/assistencia/assistencia.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { PatternLockPad } from "@/components/assistencia/pattern-lock-pad";
import type { Cliente, ChecklistOS } from "@/types";
import type { AparelhoComProduto } from "@/services/estoque/estoque.service";

const ITENS_CHECKLIST: { key: keyof ChecklistOS; label: string }[] = [
  { key: "liga", label: "Liga" },
  { key: "molhado", label: "Molhado" },
  { key: "arranhado", label: "Arranhado" },
  { key: "tela", label: "Tela" },
  { key: "face_id", label: "Face ID" },
  { key: "touch", label: "Touch" },
  { key: "botoes", label: "Botões" },
  { key: "cameras", label: "Câmeras" },
  { key: "biometria", label: "Biometria" },
  { key: "senha_informada", label: "Senha informada" },
];

export function OrdemServicoForm({ clientes, aparelhos }: { clientes: Cliente[]; aparelhos: AparelhoComProduto[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [clienteNovo, setClienteNovo] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [senhaTipo, setSenhaTipo] = useState<"numerica" | "desenho">("numerica");
  const [senhaValor, setSenhaValor] = useState("");
  const [observacoesChecklist, setObservacoesChecklist] = useState("");

  const form = useForm<OrdemServicoFormValues>({
    resolver: zodResolver(ordemServicoSchema),
    defaultValues: {
      cliente_id: "", cliente_novo_nome: "", cliente_novo_whatsapp: "",
      aparelho_id: "", aparelho_descricao: "", defeito: "", diagnostico_inicial: "", prazo: "", urgente: false,
    },
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

    // Campos do checklist não fazem parte do react-hook-form (são
    // controlados à parte, igual à tela de checklist separada) — vão
    // direto no FormData.
    ITENS_CHECKLIST.forEach((item) => {
      if (checked[item.key]) formData.set(item.key, "on");
    });
    formData.set("senha_tipo", senhaTipo);
    formData.set("senha_valor", senhaValor);
    formData.set("observacoes", observacoesChecklist);

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
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button
              type="button" size="sm" variant={!clienteNovo ? "default" : "outline"}
              onClick={() => setClienteNovo(false)}
            >
              <Users className="h-4 w-4" />Cliente existente
            </Button>
            <Button
              type="button" size="sm" variant={clienteNovo ? "default" : "outline"}
              onClick={() => setClienteNovo(true)}
            >
              <UserPlus className="h-4 w-4" />Cliente novo
            </Button>
          </div>

          {!clienteNovo ? (
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
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField control={form.control} name="cliente_novo_nome" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do cliente</FormLabel>
                  <FormControl><Input placeholder="Nome completo" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="cliente_novo_whatsapp" render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp</FormLabel>
                  <FormControl><Input placeholder="Somente números, com DDD" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          )}
        </div>

        <FormField control={form.control} name="aparelho_descricao" render={({ field }) => (
          <FormItem>
            <FormLabel>Aparelho (descrição livre)</FormLabel>
            <FormControl><Input placeholder="Ex: iPhone 12, preto, 128GB" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="aparelho_id" render={({ field }) => (
          <FormItem>
            <FormLabel>Ou vincular a um aparelho do estoque (opcional)</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Nenhum — é aparelho do cliente" /></SelectTrigger></FormControl>
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

        <FormField control={form.control} name="diagnostico_inicial" render={({ field }) => (
          <FormItem>
            <FormLabel>Diagnóstico inicial (opcional)</FormLabel>
            <FormControl>
              <Textarea placeholder="Primeira impressão de quem recebeu o aparelho, antes de abrir" {...field} />
            </FormControl>
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

        {/* Checklist de recebimento — na mesma tela, não numa etapa depois */}
        <div className="flex flex-col gap-3 rounded-md border border-border p-4">
          <p className="text-sm font-medium text-foreground">Checklist de recebimento</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ITENS_CHECKLIST.map((item) => (
              <label key={item.key} className="flex items-center gap-2 rounded-md border border-border p-2 text-sm">
                <Checkbox
                  checked={checked[item.key] ?? false}
                  onCheckedChange={(v) => setChecked((prev) => ({ ...prev, [item.key]: v === true }))}
                />
                {item.label}
              </label>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">Senha do aparelho (opcional)</p>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant={senhaTipo === "numerica" ? "default" : "outline"} onClick={() => setSenhaTipo("numerica")}>
                Senha normal
              </Button>
              <Button type="button" size="sm" variant={senhaTipo === "desenho" ? "default" : "outline"} onClick={() => setSenhaTipo("desenho")}>
                Padrão de desenho
              </Button>
            </div>

            {senhaTipo === "numerica" ? (
              <Input
                placeholder="Ex: 1234"
                value={senhaValor}
                onChange={(e) => setSenhaValor(e.target.value)}
                autoComplete="off"
              />
            ) : (
              <PatternLockPad value={senhaValor} onChange={setSenhaValor} />
            )}
            <p className="text-[11px] text-muted-foreground">
              Visível só para a equipe técnica — usado apenas para testar o aparelho.
            </p>
          </div>

          <Textarea
            placeholder="Observações do checklist (opcional)"
            value={observacoesChecklist}
            onChange={(e) => setObservacoesChecklist(e.target.value)}
          />
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
