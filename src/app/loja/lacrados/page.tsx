import Link from "next/link";
import { Smartphone } from "lucide-react";
import { listarLacradosModelosPublico, slugify } from "@/services/lacrados/lacrados-publico.service";

export default async function LacradosListaPage() {
  const modelos = await listarLacradosModelosPublico();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="mb-1 font-display text-2xl font-semibold text-foreground">iPhone Lacrado</h1>
      <p className="mb-8 text-sm text-muted-foreground">Aparelhos novos, lacrados de fábrica, com nota fiscal e garantia Apple.</p>

      {modelos.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Nenhum modelo disponível no momento — confere com a gente pelo WhatsApp.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {modelos.map((m) => (
            <Link
              key={m.id}
              href={`/loja/lacrados/${slugify(m.nome)}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white transition-all hover:-translate-y-1 hover:shadow-[0_12px_32px_-12px_rgba(16,24,40,0.15)]"
            >
              <div className="flex aspect-square items-center justify-center bg-gradient-to-br from-[#FAFBFC] to-[#F0F2F6]">
                <Smartphone className="h-16 w-16 text-black/[0.08] transition-transform duration-500 group-hover:scale-110" strokeWidth={1} />
              </div>
              <div className="flex flex-col gap-1 p-4">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Lacrado</span>
                <span className="text-sm font-semibold text-foreground">{m.nome}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
