"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { criarFuncionarioAction } from "@/services/equipe/equipe.actions";

const CARGOS = [
  { value: "admin", label: "Admin" },
  { value: "gerente", label: "Gerente" },
  { value: "vendedor", label: "Vendedor (loja)" },
  { value: "tecnico", label: "Técnico" },
  { value: "caixa", label: "Caixa" },
  { value: "vendedor_prostec", label: "Vendedor (Prostec)" },
];

export function NovoFuncionarioForm() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cargo, setCargo] = useState("vendedor");
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [senhaGerada, setSenhaGerada] = useState<string | null>(null);

  async function handleCriar() {
    setCriando(true);
    setErro(null);
    const result = await criarFuncionarioAction(nome, email, cargo);
    setCriando(false);
    if (!result.success) return setErro(result.error);
    setSenhaGerada(result.data.senhaProvisoria);
    setNome(""); setEmail("");
  }

  if (senhaGerada) {
    return (
      <div className="rounded-lg border border-success/30 bg-success/5 p-3 text-xs">
        <p className="font-medium text-success">Conta criada! Passa pra ele:</p>
        <p className="mt-1">E-mail: <strong>{email}</strong></p>
        <p>Senha provisória: <strong>{senhaGerada}</strong></p>
        <p className="mt-1 text-muted-foreground">Guarda essa senha agora — não aparece de novo.</p>
        <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => setSenhaGerada(null)}>Cadastrar outro</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Input placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} className="h-9 text-xs" />
      <Input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} className="h-9 text-xs" />
      <Select value={cargo} onValueChange={setCargo}>
        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {CARGOS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
        </SelectContent>
      </Select>
      {erro && <p className="text-[11px] text-danger">{erro}</p>}
      <Button type="button" size="sm" onClick={handleCriar} disabled={criando}>{criando ? "Criando..." : "Criar conta"}</Button>
    </div>
  );
}
