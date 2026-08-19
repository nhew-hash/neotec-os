"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cadastrarEmpresaManualAction } from "@/services/prostec/prostec.actions";

export function NovaEmpresaForm() {
  const [aberto, setAberto] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const result = await cadastrarEmpresaManualAction(formData);
      if (!result.success) return setErro(result.error);
      setAberto(false);
    });
  }

  if (!aberto) {
    return (
      <Button type="button" size="sm" onClick={() => setAberto(true)} className="gap-1.5">
        <Plus className="h-3.5 w-3.5" />Cadastrar empresa
      </Button>
    );
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-2 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
      <div className="grid grid-cols-2 gap-2">
        <Input name="name" placeholder="Nome da empresa *" className="h-9 text-xs" required />
        <Input name="category" placeholder="Categoria (ex: restaurante)" className="h-9 text-xs" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input name="city" placeholder="Cidade *" className="h-9 text-xs" required />
        <Input name="state" placeholder="UF (ex: MG)" className="h-9 text-xs" maxLength={2} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input name="phone" placeholder="Telefone" className="h-9 text-xs" />
        <Input name="whatsapp" placeholder="WhatsApp" className="h-9 text-xs" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input name="website" placeholder="Site (se tiver)" className="h-9 text-xs" />
        <Input name="instagram" placeholder="Instagram" className="h-9 text-xs" />
      </div>
      {erro && <p className="text-[11px] text-danger">{erro}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>{isPending ? "Cadastrando..." : "Cadastrar"}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setAberto(false)}>Cancelar</Button>
      </div>
    </form>
  );
}
