"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { criarRegraAction } from "@/services/neo-performance/neo-performance-avancado.actions";
import type { AutomationRegra } from "@/types";

const CAMPOS = ["cac", "gasto", "vendas", "leads", "roas"] as const;
const OPERADORES = [">", "<", ">=", "<=", "=="] as const;

export function NovaRegraForm() {
  const [isPending, startTransition] = useTransition();
  const [nome, setNome] = useState("");
  const [campo, setCampo] = useState<string>("cac");
  const [operador, setOperador] = useState<string>(">");
  const [valor, setValor] = useState("");
  const [acao, setAcao] = useState("");
  const [mensagem, setMensagem] = useState<string | null>(null);

  function handleCriar() {
    if (!nome.trim() || !valor.trim() || !acao.trim()) return;
    setMensagem(null);
    const condicoes: AutomationRegra["condicoes"] = [{ campo, operador: operador as typeof OPERADORES[number], valor: Number(valor) }];
    startTransition(async () => {
      const resultado = await criarRegraAction({ nome: nome.trim(), condicoes, acao: acao.trim() });
      if (!resultado.success) { setMensagem(resultado.error); return; }
      setNome(""); setValor(""); setAcao("");
      setMensagem("Regra criada (desativada por padrão).");
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Input placeholder="Nome da regra" value={nome} onChange={(e) => setNome(e.target.value)} />
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">SE</span>
        <Select value={campo} onValueChange={setCampo}>
          <SelectTrigger className="h-9 w-28 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{CAMPOS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={operador} onValueChange={setOperador}>
          <SelectTrigger className="h-9 w-20 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{OPERADORES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
        </Select>
        <Input className="h-9 w-24" type="number" placeholder="valor" value={valor} onChange={(e) => setValor(e.target.value)} />
      </div>
      <Input placeholder="ENTÃO (ex: reduzir orçamento em 15%)" value={acao} onChange={(e) => setAcao(e.target.value)} />
      <Button size="sm" onClick={handleCriar} disabled={isPending || !nome.trim() || !valor.trim() || !acao.trim()} className="w-fit">Criar regra</Button>
      {mensagem && <p className="text-xs text-muted-foreground">{mensagem}</p>}
    </div>
  );
}
