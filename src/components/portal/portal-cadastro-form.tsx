"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { portalCadastroAction } from "@/services/portal/portal.actions";

export function PortalCadastroForm() {
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const result = await portalCadastroAction(formData);
      if (result && !result.success) setErro(result.error);
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-3">
      <Input name="nome" placeholder="Nome completo" required />
      <Input name="whatsapp" placeholder="WhatsApp (DDD + número)" required />
      <Input name="cpf" placeholder="CPF (opcional)" />
      <Input type="email" name="email" placeholder="Seu e-mail" required />
      <Input type="password" name="senha" placeholder="Escolhe uma senha" required minLength={6} />
      {erro && <p className="text-xs text-danger">{erro}</p>}
      <Button type="submit" disabled={isPending}>{isPending ? "Criando..." : "Criar conta"}</Button>
      <Link href="/portal/login" className="text-center text-xs text-muted-foreground hover:text-primary">Já tem conta? Entrar</Link>
    </form>
  );
}
