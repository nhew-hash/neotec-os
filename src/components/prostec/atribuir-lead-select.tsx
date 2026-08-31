"use client";

import { useState, useTransition } from "react";
import { UserCog } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { atribuirLeadVendedorAction } from "@/services/prostec/prostec.actions";

interface VendedorProstec { id: string; nome: string }

export function AtribuirLeadSelect({ leadId, assignedTo, vendedores }: { leadId: string; assignedTo: string | null; vendedores: VendedorProstec[] }) {
  const [valor, setValor] = useState(assignedTo ?? "nenhum");
  const [isPending, startTransition] = useTransition();

  function handleMudar(novoValor: string) {
    setValor(novoValor);
    startTransition(() => { void atribuirLeadVendedorAction(leadId, novoValor === "nenhum" ? null : novoValor); });
  }

  return (
    <div className="flex items-center gap-2">
      <UserCog className="h-4 w-4 shrink-0 text-muted-foreground" />
      <Select value={valor} onValueChange={handleMudar} disabled={isPending}>
        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Sem vendedor atribuído" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="nenhum">Sem vendedor atribuído</SelectItem>
          {vendedores.map((v) => <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
