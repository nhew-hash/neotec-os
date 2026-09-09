"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { criarAcessoExternoAction } from "@/services/acesso-externo/acesso-externo.actions";

/** Botão de "dar login" pra investidor/indicador — mostra a senha provisória UMA vez, depois de criada (não fica salva em lugar nenhum pra você recuperar depois, é assim que autenticação funciona). */
export function CriarAcessoButton({ tipo, registroId, temAcesso }: { tipo: "investidor" | "indicador"; registroId: string; temAcesso: boolean }) {
  const [aberto, setAberto] = useState(false);
  const [email, setEmail] = useState("");
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [senhaGerada, setSenhaGerada] = useState<string | null>(null);

  async function handleCriar() {
    setCriando(true);
    setErro(null);
    const result = await criarAcessoExternoAction(tipo, registroId, email);
    setCriando(false);
    if (!result.success) return setErro(result.error);
    setSenhaGerada(result.data.senhaProvisoria);
  }

  if (temAcesso) {
    return <span className="text-xs font-medium text-success">✓ Já tem login próprio</span>;
  }

  if (senhaGerada) {
    return (
      <div className="rounded-lg border border-success/30 bg-success/5 p-3 text-xs">
        <p className="font-medium text-success">Login criado! Passa pra {tipo === "investidor" ? "o investidor" : "o indicador"}:</p>
        <p className="mt-1">E-mail: <strong>{email}</strong></p>
        <p>Senha provisória: <strong>{senhaGerada}</strong></p>
        <p className="mt-1 text-muted-foreground">Guarda essa senha agora — não aparece de novo depois que você sair daqui.</p>
      </div>
    );
  }

  if (!aberto) {
    return (
      <Button type="button" size="sm" variant="outline" onClick={() => setAberto(true)} className="gap-1.5">
        <KeyRound className="h-3.5 w-3.5" />Dar acesso de login
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <Input type="email" placeholder="E-mail pra login" value={email} onChange={(e) => setEmail(e.target.value)} className="h-9 text-xs" />
      {erro && <p className="text-[11px] text-danger">{erro}</p>}
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={handleCriar} disabled={criando}>{criando ? "Criando..." : "Criar acesso"}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setAberto(false)}>Cancelar</Button>
      </div>
    </div>
  );
}
