"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { criarFiadorAction } from "@/services/crediario/crediario.actions";

export function NovoFiadorForm() {
  const [aberto, setAberto] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const result = await criarFiadorAction(formData);
      if (!result.success) return setErro(result.error);
      setAberto(false);
    });
  }

  if (!aberto) return <Button type="button" onClick={() => setAberto(true)}>Novo fiador</Button>;

  return (
    <form action={handleSubmit} className="grid grid-cols-2 gap-3 rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
      <Input name="nome" placeholder="Nome completo *" />
      <Input name="cpf" placeholder="CPF *" />
      <Input name="telefone" placeholder="Telefone" />
      <Input name="email" placeholder="E-mail" />
      <Input name="endereco" placeholder="Endereço" className="col-span-2" />
      <Input name="cidade" placeholder="Cidade" />
      <Input name="estado" placeholder="Estado" />
      <Input name="profissao" placeholder="Profissão" />
      <Input type="number" name="renda_declarada" placeholder="Renda declarada (R$)" />
      <Input name="relacao_com_cliente" placeholder="Relação com o cliente" className="col-span-2" />
      {erro && <p className="col-span-2 text-xs text-danger">{erro}</p>}
      <div className="col-span-2 flex gap-2">
        <Button type="submit" disabled={isPending}>{isPending ? "Salvando..." : "Cadastrar fiador"}</Button>
        <Button type="button" variant="ghost" onClick={() => setAberto(false)}>Cancelar</Button>
      </div>
    </form>
  );
}
