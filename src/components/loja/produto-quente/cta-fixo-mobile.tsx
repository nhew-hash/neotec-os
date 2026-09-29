import { ShoppingBag } from "lucide-react";
import { formatCurrency } from "@/utils";

/**
 * Barra fixa no rodapé, só em mobile (`lg:hidden`) — não existia
 * nenhum padrão de "sticky CTA" no projeto antes desta fase (ver
 * relatório de arquitetura), então isso foi construído do zero.
 *
 * Decisão de design: em vez de duplicar o estado de seleção de
 * unidade/variante (que já vive dentro de `AdicionarAoCarrinho`) pra
 * fazer esse botão "comprar" sozinho — o que arriscaria os dois
 * ficarem dessincronizados —, o botão rola a tela até o bloco de
 * compra de verdade (`#comprar-agora`). Continua sempre acessível
 * durante a navegação (item 18 do brief) sem duplicar lógica de
 * carrinho nem arriscar um workaround frágil.
 */
export function CtaFixoMobile({ preco }: { preco: number | null }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-black/[0.06] bg-white/95 p-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur lg:hidden">
      {preco != null && (
        <span className="font-display text-lg font-bold text-foreground">{formatCurrency(preco)}</span>
      )}
      <a
        href="#comprar-agora"
        className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20"
      >
        <ShoppingBag className="h-4 w-4" />COMPRAR AGORA
      </a>
    </div>
  );
}
