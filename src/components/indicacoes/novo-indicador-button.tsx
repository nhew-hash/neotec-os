"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { criarIndicadorAction } from "@/services/indicacoes/indicacoes.actions";

export function NovoIndicadorButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const result = await criarIndicadorAction(formData);
      if (!result.success) return setErro(result.error);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button><Plus className="h-4 w-4" />Novo indicador</Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex flex-col gap-4 p-6">
        <h2 className="font-display text-lg font-semibold text-foreground">Novo indicador</h2>
        <form action={handleSubmit} className="flex flex-col gap-3">
          <Input name="nome" placeholder="Nome" required />
          <Input name="telefone" placeholder="WhatsApp (opcional)" />
          <Input name="observacoes" placeholder="Observações (opcional)" />
          {erro && <p className="text-xs text-danger">{erro}</p>}
          <Button type="submit" disabled={isPending}>{isPending ? "Salvando..." : "Cadastrar"}</Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
