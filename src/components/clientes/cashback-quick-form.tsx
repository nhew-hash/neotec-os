"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { registrarCashbackAction } from "@/services/cashback/cashback.actions";

export function CashbackQuickForm({ clienteId }: { clienteId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setErro(null);
    formData.set("cliente_id", clienteId);
    startTransition(async () => {
      const result = await registrarCashbackAction(formData);
      if (!result.success) return setErro(result.error);
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Select name="tipo" defaultValue="credito">
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="credito">Crédito</SelectItem>
            <SelectItem value="debito">Débito</SelectItem>
          </SelectContent>
        </Select>
        <Input name="valor" type="number" step="0.01" placeholder="Valor" className="flex-1" />
      </div>
      <Input name="origem" placeholder="Origem (opcional)" />
      {erro && <p className="text-xs text-danger">{erro}</p>}
      <Button type="submit" size="sm" disabled={isPending}>{isPending ? "Salvando..." : "Registrar"}</Button>
    </form>
  );
}
