import { ChevronDown } from "lucide-react";
import type { ProdutoPublico } from "@/lib/achadinhos/tipos";
import { cn } from "@/lib/utils";
import { CardProduto } from "./card-produto";
import { RECORTE_ETIQUETA, TITULO } from "./estilos";

/**
 * Abertura da página: título e a frase de posicionamento do briefing sobre
 * navy, com a pílula em formato de etiqueta de preço. Os destaques (se
 * houver) ficam logo abaixo, no mesmo bloco, pra o produto aparecer antes
 * de qualquer rolagem. O número de achadinhos é a contagem REAL do catálogo.
 */
export function HeroAchadinhos({ total, destaques }: { total: number; destaques: ProdutoPublico[] }) {
  return (
    <section
      aria-labelledby="titulo-achadinhos"
      className="relative overflow-hidden bg-achados-navy text-white [background-image:radial-gradient(60rem_28rem_at_90%_-15%,rgba(38,67,214,0.6),transparent_62%),radial-gradient(28rem_18rem_at_-5%_105%,rgba(200,245,60,0.14),transparent_60%)]"
    >
      <div className={cn("mx-auto max-w-6xl px-4 pt-12 sm:pt-16", destaques.length > 0 ? "pb-10 sm:pb-14" : "pb-16 sm:pb-20")}>
        <p
          className="relative inline-flex items-center bg-achados-lime py-2 pl-[22px] pr-4 text-sm font-bold text-achados-navy"
          style={{ clipPath: RECORTE_ETIQUETA, borderRadius: "0 10px 10px 0" }}
        >
          <span aria-hidden className="absolute left-[10px] top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-achados-navy" />
          🔥 Ofertas que encontramos e valem a pena
        </p>

        <h1 id="titulo-achadinhos" className={cn(TITULO, "mt-6 max-w-3xl text-[44px] font-extrabold leading-[1.02] tracking-[-0.03em] sm:text-6xl lg:text-7xl")}>
          Achadinhos da Neotec
        </h1>

        <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/75">
          Produtos selecionados pela equipe da Neotec. A gente garimpa as ofertas, você confere e compra direto no Mercado Livre.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
          <a
            href="#catalogo"
            className="inline-flex h-12 items-center gap-2 rounded-2xl bg-white px-6 font-bold text-achados-navy transition-colors hover:bg-achados-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-achados-navy"
          >
            Ver as ofertas <ChevronDown className="h-4 w-4" aria-hidden />
          </a>
          {total > 0 && (
            <p className="text-sm text-white/70">
              {total} {total === 1 ? "achadinho no ar" : "achadinhos no ar"} agora
            </p>
          )}
        </div>

        {destaques.length > 0 && (
          <div className="mt-12">
            <h2 className={cn(TITULO, "text-2xl font-extrabold tracking-tight")}>Em destaque</h2>
            <ul className="-mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4">
              {destaques.map((p, i) => (
                <li key={p.id} className="w-[68%] shrink-0 snap-start sm:w-[250px]">
                  <CardProduto produto={p} prioridade={i < 3} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
