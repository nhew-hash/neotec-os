import Link from "next/link";
import { MessageCircle, MapPin } from "lucide-react";
import { CATEGORIAS_LOJA } from "./categorias";

export function LojaFooter() {
  return (
    <footer className="mt-20 border-t border-black/[0.06] bg-[#FAFBFC]">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-12 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-1">
          <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-display text-sm font-bold text-white">N</div>
          <p className="text-sm text-muted-foreground">Assistência técnica e loja especializada em produtos Apple, em Araguari.</p>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Categorias</p>
          <div className="flex flex-col gap-2">
            {CATEGORIAS_LOJA.map((c) => (
              <Link key={c.valor} href={`/loja/categoria/${c.valor}`} className="text-sm text-foreground/80 hover:text-primary">{c.label}</Link>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contato</p>
          <a href="https://wa.me/5534999999999" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-foreground/80 hover:text-primary">
            <MessageCircle className="h-3.5 w-3.5" />WhatsApp
          </a>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assistência</p>
          <Link href="/consultar-os" className="flex items-center gap-1.5 text-sm text-foreground/80 hover:text-primary">
            <MapPin className="h-3.5 w-3.5" />Acompanhar OS
          </Link>
        </div>
      </div>
      <div className="border-t border-black/[0.06] py-4 text-center text-xs text-muted-foreground/70">
        Neotec Araguari — todos os direitos reservados
      </div>
    </footer>
  );
}
