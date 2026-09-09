"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  totalItens: number;
  itensPorPagina: number;
}

/**
 * Paginação via query string (?pagina=2) — mesmo padrão já usado na
 * busca de Clientes: resultado é compartilhável, volta certo com F5, e
 * não depende de estado escondido no navegador.
 */
export function Pagination({ totalItens, itensPorPagina }: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const paginaAtual = Number(searchParams.get("pagina") ?? "1");
  const totalPaginas = Math.max(1, Math.ceil(totalItens / itensPorPagina));

  if (totalPaginas <= 1) return null;

  function irPara(pagina: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("pagina", String(pagina));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center justify-between border-t border-border px-4 py-3">
      <p className="text-xs text-muted-foreground">
        Página {paginaAtual} de {totalPaginas} · {totalItens} registro(s)
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={paginaAtual <= 1} onClick={() => irPara(paginaAtual - 1)}>
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>
        <Button variant="outline" size="sm" disabled={paginaAtual >= totalPaginas} onClick={() => irPara(paginaAtual + 1)}>
          Próxima
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
