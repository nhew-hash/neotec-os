"use client";

import { useRouter } from "next/navigation";
import { Scale, X } from "lucide-react";
import { useComparador } from "./comparador-context";

export function BarraComparacao() {
  const router = useRouter();
  const { idsSelecionados, limpar } = useComparador();

  if (idsSelecionados.length === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 animate-fade-in border-t border-black/[0.06] bg-white/95 px-4 py-3 shadow-[0_-8px_24px_-8px_rgba(16,24,40,0.1)] backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-primary" />
          <span className="text-sm text-foreground">{idsSelecionados.length} aparelho(s) selecionado(s) pra comparar</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={limpar} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            type="button"
            onClick={() => router.push("/loja/comparar")}
            disabled={idsSelecionados.length < 2}
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Comparar agora
          </button>
        </div>
      </div>
    </div>
  );
}
