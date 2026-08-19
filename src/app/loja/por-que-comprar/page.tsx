import Link from "next/link";
import { MapPin, Check, X } from "lucide-react";

const COMPARATIVO = [
  { item: "Loja física", neotec: true, marketplace: "Nem sempre" },
  { item: "Assistência técnica própria", neotec: true, marketplace: "Geralmente não" },
  { item: "Garantia local, sem depender de terceiro", neotec: true, marketplace: "Variável" },
  { item: "Suporte pós-venda direto", neotec: true, marketplace: "Limitado" },
  { item: "Checklist técnico em todo seminovo", neotec: true, marketplace: "Raramente" },
];

export default function PorQueComprarPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <h1 className="mb-3 font-display text-section-title tracking-tight text-foreground sm:text-3xl">Por que comprar na Neotec?</h1>
      <p className="mb-10 text-sm leading-relaxed text-muted-foreground">
        Comparação honesta — sem exagero, só o que realmente muda na experiência de comprar um iPhone com a gente.
      </p>

      <div className="overflow-hidden rounded-2xl border border-black/[0.06]">
        <div className="grid grid-cols-3 gap-2 bg-[#FAFBFC] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span></span>
          <span className="text-center text-primary">Neotec</span>
          <span className="text-center">Marketplace comum</span>
        </div>
        {COMPARATIVO.map((linha, i) => (
          <div key={i} className={`grid grid-cols-3 gap-2 px-4 py-3.5 text-sm ${i % 2 === 0 ? "bg-white" : "bg-[#FAFBFC]/50"}`}>
            <span className="text-foreground">{linha.item}</span>
            <span className="flex justify-center">
              {linha.neotec ? <Check className="h-4 w-4 text-success" /> : <X className="h-4 w-4 text-danger" />}
            </span>
            <span className="text-center text-xs text-muted-foreground">{linha.marketplace}</span>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl bg-[#FAFBFC] p-6 text-center">
        <MapPin className="h-5 w-5 text-primary" />
        <p className="text-sm font-medium text-foreground">Estamos aqui</p>
        <p className="text-sm text-muted-foreground">Rua Rui Barbosa, 355 — Araguari, MG</p>
        <a
          href="https://www.google.com/maps/search/?api=1&query=Rua+Rui+Barbosa+355+Araguari+MG"
          target="_blank" rel="noopener noreferrer"
          className="mt-1 text-sm font-medium text-primary hover:underline"
        >
          Ver no mapa →
        </a>
      </div>

      <div className="mt-8 text-center">
        <Link href="/loja" className="rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-white">Ver produtos</Link>
      </div>
    </div>
  );
}
