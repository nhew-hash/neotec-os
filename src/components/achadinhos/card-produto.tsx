import Link from "next/link";
import { ImageIcon } from "lucide-react";
import { descontoExibido } from "@/lib/achadinhos/apresentacao";
import type { ProdutoPublico } from "@/lib/achadinhos/tipos";
import { cn } from "@/lib/utils";
import { EtiquetaDesconto } from "./etiqueta-desconto";
import { Preco } from "./preco";

interface Props {
  produto: ProdutoPublico;
  /** Primeiras imagens da página carregam já (LCP); as demais, só ao rolar. */
  prioridade?: boolean;
  className?: string;
}

/** Card do catálogo. O card inteiro é o link pra página do produto; o "Ver oferta" é só o rótulo visual da ação. */
export function CardProduto({ produto, prioridade = false, className }: Props) {
  const desconto = descontoExibido(produto);
  const selo = produto.selo?.trim() || (produto.destaque ? "Destaque" : null);

  return (
    <article className={cn("h-full", className)}>
      <Link
        href={`/achadinhos/${produto.slug}`}
        className="group relative flex h-full flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-achados-line transition-[transform,box-shadow] motion-safe:duration-200 hover:shadow-[0_14px_34px_-14px_rgba(11,27,77,0.35)] motion-safe:hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div className="relative aspect-square border-b border-achados-line/70 bg-white p-4">
          {produto.imagem_principal ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={produto.imagem_principal}
              alt={produto.nome}
              width={400}
              height={400}
              loading={prioridade ? "eager" : "lazy"}
              decoding="async"
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-2xl bg-achados-mist text-achados-muted" role="img" aria-label="Produto sem foto">
              <ImageIcon className="h-10 w-10" aria-hidden />
            </div>
          )}
          {selo && (
            <span className="absolute left-3 top-3 rounded-full bg-achados-navy px-2.5 py-1 text-xs font-semibold text-white">{selo}</span>
          )}
          {desconto !== null && <EtiquetaDesconto percentual={desconto} className="absolute right-0 top-4" />}
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4">
          {produto.categoria && <p className="text-xs font-medium text-achados-muted">{produto.categoria}</p>}
          <h3 className="line-clamp-2 min-h-[2.5rem] text-[15px] font-semibold leading-snug text-achados-navy">{produto.nome}</h3>
          <div className="mt-auto flex flex-col gap-3 pt-1">
            <Preco produto={produto} variante="card" />
            <span className="flex h-11 items-center justify-center rounded-2xl bg-achados-navy text-sm font-bold text-white transition-colors group-hover:bg-primary">
              Ver oferta
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
