"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trocarSenhaPrimeiroAcessoAction } from "@/services/portal/portal.actions";

export default function TrocarSenhaPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const result = await trocarSenhaPrimeiroAcessoAction(formData);
      if (!result.success) return setErro(result.error);
      router.push("/portal/dashboard");
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-app p-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-xl font-semibold text-foreground">Crie sua senha</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Este é seu primeiro acesso. Por segurança, defina uma senha só sua antes de continuar.
        </p>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="novaSenha">Nova senha</Label>
            <Input id="novaSenha" name="novaSenha" type="password" minLength={6} required />
          </div>
          {erro && <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{erro}</p>}
          <Button type="submit" disabled={isPending}>{isPending ? "Salvando..." : "Continuar"}</Button>
        </form>
      </div>
    </div>
  );
}
