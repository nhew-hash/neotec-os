"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { caminhoCompra } from "@/lib/achadinhos/apresentacao";
import { cn } from "@/lib/utils";
import { TITULO } from "./estilos";
import { lerUtms } from "./utm-storage";

interface Props {
  slug: string;
  /** Caminho da página onde o botão está (vai pro evento `affiliate_click` como `page`). */
  pagina: string;
  /** Posição do clique (`source`): "pdp" no botão principal, "pdp_fixo" na barra fixa do celular. */
  origemClique?: "pdp" | "pdp_fixo";
  id?: string;
  className?: string;
  /** Rótulo visível; por padrão, o do briefing. */
  rotulo?: string;
}

/**
 * Botão de compra. Aponta pra `/achadinhos/ir/[slug]`, que registra o
 * clique e redireciona pro Mercado Livre — o link de afiliado cru nunca
 * fica no HTML. Funciona sem JavaScript; com JS, acrescenta as UTMs da
 * visita (URL atual ou guardadas na sessão). Abre em nova aba com
 * `noopener noreferrer` e `sponsored nofollow` (link de afiliado).
 */
export function BotaoComprar({ slug, pagina, origemClique = "pdp", id, className, rotulo = "🛒 COMPRAR PELO MERCADO LIVRE" }: Props) {
  const [href, setHref] = useState(() => caminhoCompra(slug, origemClique, pagina));

  useEffect(() => {
    setHref(caminhoCompra(slug, origemClique, pagina, lerUtms()));
  }, [slug, origemClique, pagina]);

  return (
    <a
      id={id}
      href={href}
      target="_blank"
      rel="noopener noreferrer sponsored nofollow"
      className={cn(
        TITULO,
        "inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-achados-navy bg-achados-lime px-5 text-center font-extrabold tracking-tight text-achados-navy transition-[filter,transform] hover:brightness-95 motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        className
      )}
    >
      <span>{rotulo}</span>
      <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
      <span className="sr-only">(abre o Mercado Livre em uma nova aba)</span>
    </a>
  );
}
