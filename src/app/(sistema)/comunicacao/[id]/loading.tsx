import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/** Aparece na hora ao tocar numa conversa, enquanto as mensagens carregam. */
export default function CarregandoConversa() {
  return (
    <div className="flex h-full min-h-0 flex-col" role="status" aria-label="Carregando a conversa">
      <div className="flex items-center gap-2 border-b border-border bg-card px-3 py-2.5 md:px-4">
        <Link href="/comunicacao" className="-ml-1 flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground md:hidden" aria-label="Voltar às conversas">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="h-9 w-9 animate-pulse rounded-full bg-secondary" />
        <div className="h-4 w-36 animate-pulse rounded bg-secondary" />
      </div>
      <div className="flex flex-1 flex-col justify-end gap-2 px-3 py-4 md:px-6">
        {[60, 45, 70, 35, 55].map((w, i) => (
          <div key={i} className={`h-9 animate-pulse rounded-2xl bg-secondary ${i % 2 ? "self-end" : "self-start"}`} style={{ width: `${w}%` }} />
        ))}
      </div>
      <div className="h-14 border-t border-border bg-card" />
    </div>
  );
}
