"use client";

import { useState, useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { salvarChecklistOSAction } from "@/services/assistencia/assistencia.actions";
import type { ChecklistOS, TipoChecklistOS } from "@/types";

const ITENS: { key: keyof ChecklistOS; label: string }[] = [
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

interface ChecklistOSFormProps {
  osId: string;
  tipo: TipoChecklistOS;
  inicial?: ChecklistOS;
}

export function ChecklistOSForm({ osId, tipo, inicial }: ChecklistOSFormProps) {
  const [isPending, startTransition] = useTransition();
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(ITENS.map((item) => [item.key, Boolean(inicial?.[item.key])]))
  );

  function handleSubmit(formData: FormData) {
    setMensagem(null);
    startTransition(async () => {
      const result = await salvarChecklistOSAction(osId, tipo, formData);
      setMensagem(result.success ? "Checklist salvo." : result.error);
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ITENS.map((item) => (
          <label key={item.key} className="flex items-center gap-2 rounded-md border border-border p-2 text-sm">
            <Checkbox
              checked={checked[item.key]}
              onCheckedChange={(v) => setChecked((prev) => ({ ...prev, [item.key]: v === true }))}
            />
            {checked[item.key] && <input type="hidden" name={item.key} value="on" />}
            {item.label}
          </label>
        ))}
      </div>
      <Textarea name="observacoes" placeholder="Observações" defaultValue={inicial?.observacoes ?? ""} />
      {mensagem && <p className="text-xs text-muted-foreground">{mensagem}</p>}
      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Salvando..." : `Salvar checklist de ${tipo === "recebimento" ? "recebimento" : "entrega"}`}
      </Button>
    </form>
  );
}
