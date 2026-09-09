"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { criarExperimentoProstecAction } from "@/services/prostec/prostec.actions";

export function NovoExperimentoForm() {
  const [aberto, setAberto] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const result = await criarExperimentoProstecAction(formData);
      if (!result.success) return setErro(result.error);
      setAberto(false);
    });
  }

  if (!aberto) return <Button type="button" onClick={() => setAberto(true)}>Novo experimento</Button>;

  return (
    <form action={handleSubmit} className="flex flex-col gap-3 rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
      <Input name="nome" placeholder="Nome do experimento (ex: Abertura mais direta vs. mais consultiva)" />
      <div>
        <label className="text-xs font-medium text-muted-foreground">Mensagem A — use {"{empresa}"} e {"{motivo}"} pra personalizar</label>
        <Textarea name="texto_a" className="mt-1 text-sm" rows={2} placeholder="Olá! Falo da Neotec, posso falar com o responsável pela {empresa}?" />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Mensagem B</label>
        <Textarea name="texto_b" className="mt-1 text-sm" rows={2} />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Amostra mínima antes de declarar vencedor</label>
        <Input type="number" name="amostra_minima" defaultValue={30} className="mt-1 w-32" />
      </div>
      {erro && <p className="text-xs text-danger">{erro}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>{isPending ? "Criando..." : "Criar e ativar"}</Button>
        <Button type="button" variant="ghost" onClick={() => setAberto(false)}>Cancelar</Button>
      </div>
    </form>
  );
}
