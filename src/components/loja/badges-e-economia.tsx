import { formatCurrency } from "@/utils";

const LABEL_SELO_MANUAL: Record<string, { label: string; cor: string }> = {
  novidade: { label: "Novidade", cor: "bg-primary text-white" },
  promocao: { label: "Promoção", cor: "bg-danger text-white" },
  oferta: { label: "Oferta", cor: "bg-warning text-white" },
  escolha_equipe: { label: "Escolha da equipe", cor: "bg-[#0B0D12] text-white" },
};

interface BadgesProdutoProps {
  selosManuais: string[];
  /** Calculado de dado real (venda de verdade) — nunca passar número inventado aqui. */
  maisVendido?: boolean;
  /** Calculado de estoque real — só true quando o estoque bate o limite configurado de verdade. */
  ultimasUnidades?: boolean;
}

export function BadgesProduto({ selosManuais, maisVendido, ultimasUnidades }: BadgesProdutoProps) {
  const badges: { label: string; cor: string }[] = [];

  if (maisVendido) badges.push({ label: "Mais vendido", cor: "bg-success text-white" });
  if (ultimasUnidades) badges.push({ label: "Últimas unidades", cor: "bg-danger text-white" });
  selosManuais.forEach((s) => {
    const info = LABEL_SELO_MANUAL[s];
    if (info) badges.push(info);
  });

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((b, i) => (
        <span key={i} className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${b.cor}`}>{b.label}</span>
      ))}
    </div>
  );
}

/** "De: X Por: Y Economize: Z" — só aparece quando existe preço antigo real configurado. Nunca calcula desconto fictício. */
export function PrecoComEconomia({ precoAtual, precoAntigo, tamanho = "grande" }: { precoAtual: number; precoAntigo: number | null; tamanho?: "grande" | "compacto" }) {
  const temEconomia = precoAntigo != null && precoAntigo > precoAtual;

  return (
    <div>
      {temEconomia && <span className="text-xs text-muted-foreground line-through">{formatCurrency(precoAntigo!)}</span>}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={tamanho === "grande" ? "font-display text-3xl font-bold text-foreground" : "text-base font-bold text-foreground"}>
          {formatCurrency(precoAtual)}
        </span>
        {temEconomia && tamanho === "grande" && (
          <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success-text">
            Economize {formatCurrency(precoAntigo! - precoAtual)}
          </span>
        )}
      </div>
    </div>
  );
}

export function AvisoDescontoPix({ percentual, valor }: { percentual: number; valor: number }) {
  if (percentual <= 0) return null;
  const valorComDesconto = valor * (1 - percentual / 100);

  return (
    <p className="flex items-center gap-1.5 text-xs font-medium text-success-text">
      💚 Economize {percentual}% pagando no Pix — {formatCurrency(valorComDesconto)}
    </p>
  );
}

export function AvisoEstoque({ quantidade, limiteEstoqueBaixo }: { quantidade: number; limiteEstoqueBaixo: number }) {
  if (quantidade <= 0) return null;
  if (quantidade <= limiteEstoqueBaixo) {
    return <p className="flex w-fit items-center gap-1 rounded-full bg-danger/10 px-3 py-1 text-xs font-medium text-danger">🔥 Restam apenas {quantidade} unidade{quantidade > 1 ? "s" : ""}</p>;
  }
  return (
    <span className="flex w-fit items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success-text">
      <span className="h-1.5 w-1.5 rounded-full bg-success" />Disponível
    </span>
  );
}
