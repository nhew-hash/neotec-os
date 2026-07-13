"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { portalCadastroAction } from "@/services/portal/portal.actions";

export function PortalCadastroForm() {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const result = await portalCadastroAction(formData);
      // Em caso de sucesso a Server Action já faz redirect() — só chega
      // aqui de fato se der erro.
      if (result && !result.success) setErro(result.error);
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nome">Nome completo</Label>
        <Input id="nome" name="nome" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="whatsapp">WhatsApp</Label>
        <Input id="whatsapp" name="whatsapp" placeholder="Somente números, com DDD" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cpf">CPF (opcional — ajuda a achar seu histórico se já comprou com a gente)</Label>
        <Input id="cpf" name="cpf" placeholder="000.000.000-00" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="senha">Crie uma senha</Label>
        <Input id="senha" name="senha" type="password" minLength={6} required />
      </div>

      {erro && <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{erro}</p>}

      <Button type="submit" disabled={isPending}>{isPending ? "Criando conta..." : "Criar minha conta"}</Button>
      <Link href="/portal/login" className="text-center text-xs text-muted-foreground hover:underline">
        Já tenho conta — fazer login
      </Link>
    </form>
  );
}
