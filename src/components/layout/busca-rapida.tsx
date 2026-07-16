"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

/**
 * Busca rápida do cabeçalho. Não é uma busca global nova — reaproveita a
 * busca de Clientes que já existe (nome/telefone/CPF/e-mail), só dá um
 * atalho pra chegar lá sem precisar navegar até a tela primeiro.
 */
export function BuscaRapida() {
  const router = useRouter();
  const [termo, setTermo] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!termo.trim()) return;
    router.push(`/clientes?busca=${encodeURIComponent(termo.trim())}`);
  }

  return (
    <form onSubmit={handleSubmit} className="relative hidden w-64 lg:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
        placeholder="Buscar cliente..."
        className="h-9 bg-secondary/60 pl-9 text-sm"
      />
    </form>
  );
}
