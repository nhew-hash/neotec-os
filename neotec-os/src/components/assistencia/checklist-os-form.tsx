"use client";

import { useState, useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

      {/* A senha em si só faz sentido capturar no recebimento — é o que o
          técnico usa pra testar o aparelho, não algo a registrar de novo
          na entrega. */}
      {tipo === "recebimento" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="senha_valor">Senha do aparelho (opcional)</Label>
          <div className="flex gap-2">
            <Select name="senha_tipo" defaultValue={inicial?.senha_tipo ?? "numerica"}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="numerica">Senha normal</SelectItem>
                <SelectItem value="desenho">Padrão de desenho</SelectItem>
              </SelectContent>
            </Select>
            <Input
              id="senha_valor"
              name="senha_valor"
              placeholder="Ex: 1234, ou descreva o desenho (ex: L invertido, Z, U)"
              defaultValue={inicial?.senha_valor ?? ""}
              autoComplete="off"
              className="flex-1"
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Visível só para a equipe técnica — usado apenas para testar o aparelho.
          </p>
        </div>
      )}

      <Textarea name="observacoes" placeholder="Observações" defaultValue={inicial?.observacoes ?? ""} />
      {mensagem && <p className="text-xs text-muted-foreground">{mensagem}</p>}
      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Salvando..." : `Salvar checklist de ${tipo === "recebimento" ? "recebimento" : "entrega"}`}
      </Button>
    </form>
  );
}
