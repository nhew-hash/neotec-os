"use client";

import { useState, useTransition } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { portalCadastroAction } from "@/services/portal/portal.actions";

/**
 * Convite pra criar conta DEPOIS da compra já aprovada — nunca antes.
 * A venda já aconteceu, então não existe risco de perder conversão
 * aqui; só ganha se o cliente topar (acompanhar pedido, comprar mais
 * rápido da próxima vez).
 */
export function CriarContaPosCompra({ nome, whatsapp, cpf }: { nome: string; whatsapp: string; cpf: string }) {
  const [aberto, setAberto] = useState(false);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCriar() {
    setErro(null);
    const formData = new FormData();
    formData.set("nome", nome);
    formData.set("whatsapp", whatsapp);
    formData.set("cpf", cpf);
    formData.set("email", email);
    formData.set("senha", senha);

    // portalCadastroAction redireciona sozinha pro dashboard quando dá
    // certo (nunca retorna nesse caso) — só sobra erro pra tratar aqui.
    startTransition(async () => {
      const result = await portalCadastroAction(formData);
      if (result && !result.success) setErro(result.error);
    });
  }

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className="mt-4 flex items-center gap-1.5 text-xs text-primary hover:underline">
        <UserPlus className="h-3.5 w-3.5" />Quer acompanhar seus pedidos? Cria uma senha (opcional)
      </button>
    );
  }

  return (
    <div className="mt-4 flex w-full flex-col gap-2 rounded-xl border border-border p-4 text-left">
      <p className="text-xs font-medium text-foreground">Cria uma senha pra acompanhar seus pedidos depois</p>
      <Input type="email" placeholder="Seu e-mail" value={email} onChange={(e) => setEmail(e.target.value)} className="h-9 text-sm" />
      <Input type="password" placeholder="Escolhe uma senha" value={senha} onChange={(e) => setSenha(e.target.value)} className="h-9 text-sm" />
      {erro && <p className="text-xs text-danger">{erro}</p>}
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={handleCriar} disabled={isPending || !email || !senha}>{isPending ? "Criando..." : "Criar conta"}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setAberto(false)}>Agora não</Button>
      </div>
    </div>
  );
}
