"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const ORIGENS = [
  { value: "instagram", label: "Instagram" },
  { value: "google", label: "Google" },
  { value: "indicacao", label: "Indicação" },
  { value: "loja_fisica", label: "Loja física" },
  { value: "shopify", label: "Shopify" },
  { value: "outros", label: "Outros" },
] as const;

export function ClientesSearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [busca, setBusca] = useState(searchParams.get("busca") ?? "");

  function atualizarUrl(campo: string, valor: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (valor) params.set(campo, valor);
    else params.delete(campo);

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function handleBuscaChange(valor: string) {
    setBusca(valor);
    atualizarUrl("busca", valor);
  }

  const temFiltroAtivo = searchParams.get("nivel") || searchParams.get("origem");

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(e) => handleBuscaChange(e.target.value)}
          placeholder="Buscar por nome, telefone, CPF ou e-mail..."
          className="pl-9"
        />
        {isPending && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">buscando...</span>
        )}
      </div>

      <Select value={searchParams.get("nivel") ?? "todos"} onValueChange={(v) => atualizarUrl("nivel", v === "todos" ? "" : v)}>
        <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Nível" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos os níveis</SelectItem>
          <SelectItem value="normal">Normal</SelectItem>
          <SelectItem value="vip">VIP</SelectItem>
        </SelectContent>
      </Select>

      <Select value={searchParams.get("origem") ?? "todas"} onValueChange={(v) => atualizarUrl("origem", v === "todas" ? "" : v)}>
        <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Origem" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="todas">Todas as origens</SelectItem>
          {ORIGENS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>

      {(busca || temFiltroAtivo) && (
        <Button
          variant="ghost" size="icon"
          onClick={() => { setBusca(""); router.push(pathname); }}
          title="Limpar filtros"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
