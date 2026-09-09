"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { registrarMovimentoIndicadorAction } from "@/services/indicacoes/indicacoes.actions";

export function NovoMovimentoIndicadorForm({ indicadorId }: { indicadorId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setErro(null);
    formData.set("indicador_id", indicadorId);
    startTransition(async () => {
      const result = await registrarMovimentoIndicadorAction(formData);
      if (!result.success) return setErro(result.error);
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-wrap items-end gap-2">
      <Select name="tipo" defaultValue="credito">
        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="credito">Crédito (+)</SelectItem>
          <SelectItem value="retirada">Retirada (-)</SelectItem>
        </SelectContent>
      </Select>
      <Input name="valor" type="number" step="0.01" min="0.01" placeholder="Valor" className="w-32" required />
      <Input name="motivo" placeholder="Motivo (opcional)" className="flex-1 min-w-[160px]" />
      <Button type="submit" disabled={isPending}>{isPending ? "Salvando..." : "Registrar"}</Button>
      {erro && <p className="w-full text-xs text-danger">{erro}</p>}
    </form>
  );
}
