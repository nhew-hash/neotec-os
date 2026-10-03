"use client";

/**
 * Link de WhatsApp genérico (fora de qualquer fluxo de fechamento de
 * pedido) que precisa disparar o evento Contact do Meta Pixel — Fase
 * 262. Existe como componente próprio porque algumas páginas que usam
 * esse link (ex: pedido/erro) são Server Components e não podem ter
 * `onClick` direto na tag `<a>`.
 */
export function LinkWhatsappContato({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <a
      href="https://wa.me/5534988178338"
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => void import("./loja-tracking-provider").then(({ rastrearContact }) => rastrearContact())}
      className={className}
    >
      {children}
    </a>
  );
}
