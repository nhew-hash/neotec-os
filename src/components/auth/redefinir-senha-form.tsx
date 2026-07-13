"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { redefinirSenhaAction } from "@/app/(auth)/login/actions";

export function RedefinirSenhaForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const result = await redefinirSenhaAction(formData);
      if (!result.success) return setErro(result.error);
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="novaSenha">Nova senha</Label>
        <Input id="novaSenha" name="novaSenha" type="password" minLength={6} required />
      </div>
      {erro && <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{erro}</p>}
      <Button type="submit" disabled={isPending}>{isPending ? "Salvando..." : "Salvar nova senha"}</Button>
    </form>
  );
}
