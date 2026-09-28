"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { X, Repeat } from "lucide-react";

const CHAVE_SESSAO = "neotec_trade_in_popup_fechado";
const ATRASO_ABERTURA_MS = 1000;

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
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflowAnterior;
    };
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
      aria-modal="true"
      aria-labelledby="trade-in-popup-titulo"
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 transition-opacity duration-200 ${visivel ? "opacity-100" : "opacity-0"}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) fechar();
      }}
    >
      <div
        className={`flex max-h-[85vh] w-full max-w-sm flex-col overflow-y-auto rounded-3xl border border-black/10 bg-white p-6 shadow-2xl transition-all duration-200 ${
          visivel ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Repeat className="h-4 w-4" />
          </div>
          <button type="button" onClick={fechar} aria-label="Fechar" className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <h2 id="trade-in-popup-titulo" className="mt-4 font-display text-lg font-semibold leading-snug text-foreground">
          Seu iPhone pode valer dinheiro na troca.
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">Use seu aparelho atual como parte do pagamento e pague menos pelo seu próximo iPhone.</p>
        <p className="mt-3 text-sm font-medium text-foreground">Faça uma avaliação do seu aparelho.</p>

        <div className="mt-5 flex flex-col gap-2">
          <Link
            href={linkTradeIn}
            onClick={fechar}
            className="flex items-center justify-center rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            QUERO FAZER UMA TROCA
          </Link>
          <button type="button" onClick={fechar} className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Agora não
          </button>
        </div>

        <p className="mt-3 text-center text-[11px] leading-snug text-muted-foreground">
          A avaliação final é feita após análise do aparelho{produtoNome ? ` — válido também na compra do ${produtoNome}` : ""}.
        </p>
      </div>
    </div>
  );
}
