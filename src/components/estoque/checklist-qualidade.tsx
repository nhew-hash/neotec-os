"use client";

import { useState, useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { salvarTesteAparelhoAction, atualizarStatusAparelhoAction } from "@/services/estoque/estoque.actions";
import type { StatusAparelho } from "@/types";

const ITENS_CHECKLIST = [
  { key: "face_id", label: "Face ID" },
  { key: "camera", label: "Câmeras" },
  { key: "tela", label: "Tela" },
  { key: "som", label: "Som" },
  { key: "microfone", label: "Microfone" },
  { key: "wifi", label: "Wi-Fi" },
  { key: "bluetooth", label: "Bluetooth" },
  { key: "carregamento", label: "Carregamento" },
] as const;

const STATUS_OPTIONS: { value: StatusAparelho; label: string }[] = [
  { value: "recebido", label: "Recebido" },
  { value: "teste", label: "Em teste" },
  { value: "aprovado", label: "Aprovado" },
  { value: "disponivel", label: "Disponível" },
  { value: "reservado", label: "Reservado" },
  { value: "vendido", label: "Vendido" },
];

export function ChecklistQualidade({ aparelhoId, statusAtual }: { aparelhoId: string; statusAtual: StatusAparelho }) {
  const [isPending, startTransition] = useTransition();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [mensagem, setMensagem] = useState<string | null>(null);

  function handleSalvarChecklist(formData: FormData) {
    setMensagem(null);
    startTransition(async () => {
      const result = await salvarTesteAparelhoAction(aparelhoId, formData);
      setMensagem(result.success ? "Checklist salvo." : result.error);
    });
  }

  function handleMudarStatus(status: string) {
    startTransition(() => {
      void atualizarStatusAparelhoAction(aparelhoId, status as StatusAparelho);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Label className="text-sm text-muted-foreground">Status atual</Label>
        <Select defaultValue={statusAtual} onValueChange={handleMudarStatus} disabled={isPending}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <form action={handleSalvarChecklist} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ITENS_CHECKLIST.map((item) => (
            <label key={item.key} className="flex items-center gap-2 rounded-md border border-border p-2.5 text-sm">
              <Checkbox
                name={item.key}
                checked={checked[item.key] ?? false}
                onCheckedChange={(value) => setChecked((prev) => ({ ...prev, [item.key]: value === true }))}
              />
              {/* Checkbox do Radix não envia valor nativo em FormData — replicamos como input hidden */}
              {checked[item.key] && <input type="hidden" name={item.key} value="on" />}
              {item.label}
            </label>
          ))}
        </div>

        {mensagem && <p className="text-xs text-muted-foreground">{mensagem}</p>}

        <Button type="submit" disabled={isPending} className="w-fit">
          {isPending ? "Salvando..." : "Salvar checklist de qualidade"}
        </Button>
      </form>
    </div>
  );
}
