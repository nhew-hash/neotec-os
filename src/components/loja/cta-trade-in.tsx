import Link from "next/link";
import { ArrowRight, Repeat } from "lucide-react";

/**
 * CTA de Trade-in reutilizado nas páginas de produto — sempre aponta pro
 * MESMO fluxo de avaliação já existente (`/loja/trade-in`), nunca cria
 * um sistema paralelo (Fase 250). `texto` deixa a chamada específica pra
 * cada contexto — ex: "Dê seu iPhone como parte do pagamento" nas
 * páginas de iPhone lacrado/seminovo, texto genérico nos demais produtos.
 */
export function CtaTradeIn({ texto = "Tem um aparelho pra dar de entrada? Avalie o seu agora" }: { texto?: string }) {
  return (
    <Link
      href="/loja/trade-in"
      className="flex items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 transition-colors hover:bg-primary/10"
    >
      <div className="flex items-center gap-3">
        <Repeat className="h-4 w-4 shrink-0 text-primary" />
        <p className="text-xs font-medium text-foreground">{texto}</p>
      </div>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-primary" />
    </Link>
  );
}
