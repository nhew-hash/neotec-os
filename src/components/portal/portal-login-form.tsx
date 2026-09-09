"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { portalLoginAction } from "@/services/portal/portal.actions";

export function PortalLoginForm() {
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const result = await portalLoginAction(formData);
      if (result && !result.success) setErro(result.error);
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-3">
      <Input type="email" name="email" placeholder="Seu e-mail" required />
      <Input type="password" name="senha" placeholder="Sua senha" required />
      {erro && <p className="text-xs text-danger">{erro}</p>}
      <Button type="submit" disabled={isPending}>{isPending ? "Entrando..." : "Entrar"}</Button>
      <Link href="/portal/cadastro" className="text-center text-xs text-muted-foreground hover:text-primary">Ainda não tem conta? Cadastre-se</Link>
    </form>
  );
}
