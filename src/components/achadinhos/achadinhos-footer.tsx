import Link from "next/link";
import { MessageCircle } from "lucide-react";

export function AchadinhosFooter() {
  return (
    <footer className="border-t border-achados-line bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-neotec.png" alt="Neotec" width={96} height={28} loading="lazy" className="h-7 w-auto object-contain object-left" />
          <p className="max-w-xl text-sm leading-relaxed text-achados-muted">
            O Achadinhos da Neotec é uma seleção de ofertas do Mercado Livre feita pela equipe da Neotec. A compra acontece
            no Mercado Livre, não aqui. A Neotec pode receber uma comissão pelas compras feitas pelos nossos links, sem custo
            extra para você. Preços e disponibilidade são do Mercado Livre e podem mudar a qualquer momento.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-sm md:items-end">
          <Link href="/loja" className="font-semibold text-achados-navy hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Conheça a loja da Neotec</Link>
          <a
            href="https://wa.me/5534988178338"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-semibold text-achados-navy hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <MessageCircle className="h-4 w-4" aria-hidden /> Falar com a Neotec no WhatsApp
          </a>
          <p className="text-achados-muted">Neotec, Araguari-MG</p>
        </div>
      </div>
    </footer>
  );
}
