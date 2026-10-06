import Link from "next/link";
import { Search } from "lucide-react";
import { TITULO } from "./estilos";
import { cn } from "@/lib/utils";

const LINK = "hidden h-10 items-center rounded-full px-3.5 text-sm font-semibold text-achados-navy transition-colors hover:bg-achados-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:inline-flex";

export function AchadinhosHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-achados-line bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link
          href="/achadinhos"
          aria-label="Achadinhos da Neotec — página inicial"
          className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-neotec.png" alt="Neotec" width={96} height={32} className="h-8 w-auto shrink-0 object-contain" />
          <span aria-hidden className="h-5 w-px bg-achados-line" />
          <span className={cn(TITULO, "truncate text-lg font-extrabold tracking-tight text-achados-navy")}>Achadinhos</span>
        </Link>

        <nav aria-label="Principal" className="flex items-center gap-1">
          <Link href="/achadinhos#catalogo" className={LINK}>Ofertas</Link>
          <Link href="/loja" className={LINK}>Loja Neotec</Link>
          <Link
            href="/achadinhos#busca"
            aria-label="Buscar achadinhos"
            className="flex h-10 w-10 items-center justify-center rounded-full text-achados-navy transition-colors hover:bg-achados-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Search className="h-5 w-5" aria-hidden />
          </Link>
        </nav>
      </div>
    </header>
  );
}
