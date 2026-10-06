import Link from "next/link";
import { TITULO } from "@/components/achadinhos/estilos";
import { cn } from "@/lib/utils";

export default function AchadinhoNaoEncontrado() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className={cn(TITULO, "text-3xl font-extrabold tracking-tight sm:text-4xl")}>Esse achadinho saiu do ar</h1>
      <p className="text-achados-muted">A oferta pode ter acabado ou o link mudou. Veja o que está no ar agora.</p>
      <Link
        href="/achadinhos"
        className="mt-2 inline-flex h-12 items-center rounded-2xl bg-achados-navy px-6 font-bold text-white hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        Ver todos os achadinhos
      </Link>
    </div>
  );
}
