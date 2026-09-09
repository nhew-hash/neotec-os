"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { solicitarRecuperacaoSenhaAction } from "@/app/(auth)/login/actions";

export function RecuperarSenhaForm() {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  function handleSubmit(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const result = await solicitarRecuperacaoSenhaAction(formData);
      if (!result.success) return setErro(result.error);
      setEnviado(true);
    });
  }

  if (enviado) {
    return (
      <div className="rounded-md bg-success-soft px-4 py-3 text-sm text-success">
        Se esse e-mail estiver cadastrado, você vai receber um link pra criar uma senha nova em instantes.
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      {erro && <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{erro}</p>}
      <Button type="submit" disabled={isPending}>{isPending ? "Enviando..." : "Enviar link de recuperação"}</Button>
      <Link href="/login/equipe" className="text-center text-xs text-muted-foreground hover:underline">← Voltar</Link>
    </form>
  );
}
