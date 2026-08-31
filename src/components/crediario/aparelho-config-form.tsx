"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { salvarAparelhoConfigAction } from "@/services/crediario/crediario.actions";

export function AparelhoConfigForm() {
  const [aberto, setAberto] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const result = await salvarAparelhoConfigAction(formData);
      if (!result.success) return setErro(result.error);
      setAberto(false);
    });
  }

  if (!aberto) return <Button type="button" size="sm" onClick={() => setAberto(true)} className="mb-3">Adicionar aparelho</Button>;

  return (
    <form action={handleSubmit} className="mb-3 grid grid-cols-2 gap-2 rounded-xl border border-border p-3 text-xs">
      <Input name="produto_id" placeholder="ID do produto (UUID)" className="col-span-2 h-8" />
      <Input type="number" name="valor_referencia" placeholder="Valor de referência (R$)" className="h-8" />
      <Input type="number" name="entrada_minima" placeholder="Entrada mínima (R$)" className="h-8" />
      <Input type="number" name="prazo_maximo_meses" placeholder="Prazo máximo (meses)" className="h-8" />
      <Input type="number" name="valor_opcao_aquisicao" placeholder="Valor opção aquisição (R$)" className="h-8" />
      {erro && <p className="col-span-2 text-danger">{erro}</p>}
      <div className="col-span-2 flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>Salvar</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setAberto(false)}>Cancelar</Button>
      </div>
    </form>
  );
}
