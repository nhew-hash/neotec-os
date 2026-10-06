"use client";

import { cn } from "@/lib/utils";
import { TITULO } from "@/components/achadinhos/estilos";

export default function ErroAchadinhos({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className={cn(TITULO, "text-3xl font-extrabold tracking-tight")}>Não deu pra carregar os achadinhos</h1>
      <p className="text-achados-muted">Foi um problema do nosso lado. Tente de novo em instantes.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-2 h-12 rounded-2xl bg-achados-navy px-6 font-bold text-white hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        Tentar de novo
      </button>
    </div>
  );
}
