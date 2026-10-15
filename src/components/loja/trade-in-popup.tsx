"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { X, Repeat } from "lucide-react";

const CHAVE_SESSAO = "neotec_trade_in_popup_fechado";
// Antes abria em 1s como modal no centro, travando a rolagem e cobrindo
// nome e preço do iPhone. Agora é um cartão no canto, sem bloquear nada,
// e só depois de o cliente ter tempo de ver o produto.
const ATRASO_ABERTURA_MS = 12000;

function lerFechados(): string[] {
  try {
    const bruto = sessionStorage.getItem(CHAVE_SESSAO);
    return bruto ? (JSON.parse(bruto) as string[]) : [];
  } catch {
    // sessionStorage pode não estar disponível (ex: modo privado/bloqueado) —
    // nesse caso o popup simplesmente sempre reaparece, sem quebrar nada.
    return [];
  }
}

function marcarFechado(pathname: string) {
  try {
    const fechados = lerFechados();
    if (!fechados.includes(pathname)) sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify([...fechados, pathname]));
  } catch {
    /* idem — falha silenciosa, não é crítico. */
  }
}

/**
 * Popup de Trade-in nas páginas de produto de iPhone (Seminovo e
 * Lacrado) — Fase 253. Sempre aponta pro MESMO fluxo de avaliação já
 * existente (`/loja/trade-in`, via `CtaTradeIn`/`TradeInWizard`); este
 * componente é só a camada de exibição, não duplica formulário nem
 * lógica de cálculo.
 *
 * Fechamento é lembrado por PÁGINA (chave = pathname) via
 * `sessionStorage`, não globalmente: fechar num iPhone não impede o
 * popup de aparecer de novo se o cliente for olhar outro iPhone
 * (comportamento pedido explicitamente). Como o efeito depende só do
 * `pathname` e roda uma vez por montagem de página, não há loop nem
 * reabertura a cada re-render do React.
 */
export function TradeInPopup({ produtoNome, linkTradeIn }: { produtoNome: string; linkTradeIn: string }) {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    if (lerFechados().includes(pathname)) return;

    const timer = setTimeout(() => setAberto(true), ATRASO_ABERTURA_MS);
    return () => clearTimeout(timer);
  }, [pathname]);

  // Anima a entrada só depois do popup existir no DOM (evita "pular" sem transição).
  useEffect(() => {
    if (!aberto) return;
    const frame = requestAnimationFrame(() => setVisivel(true));
    return () => cancelAnimationFrame(frame);
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") fechar();
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  function fechar() {
    marcarFechado(pathname);
    setVisivel(false);
    // Espera a transição de saída (200ms) antes de desmontar de vez.
    setTimeout(() => setAberto(false), 200);
  }

  if (!aberto) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="trade-in-popup-titulo"
      className={`fixed inset-x-3 bottom-[156px] z-[60] transition-all duration-300 sm:inset-x-auto sm:bottom-6 sm:left-6 sm:w-[360px] ${
        visivel ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <div className="flex items-start gap-3 rounded-2xl border border-black/[0.08] bg-white p-4 shadow-[0_16px_48px_-12px_rgba(16,24,40,0.28)]">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Repeat className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p id="trade-in-popup-titulo" className="text-sm font-semibold leading-snug text-foreground">Tem um iPhone usado? Ele vira desconto.</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Use como parte do pagamento{produtoNome ? ` do ${produtoNome}` : ""} — valor final após análise do aparelho.
          </p>
          <Link href={linkTradeIn} onClick={fechar} className="mt-2 inline-flex text-xs font-semibold text-primary hover:underline">
            Avaliar meu aparelho →
          </Link>
        </div>
        <button type="button" onClick={fechar} aria-label="Fechar" className="-mr-1 -mt-1 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
