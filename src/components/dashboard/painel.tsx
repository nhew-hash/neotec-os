import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Indicador } from "@/services/dashboard/painel.service";

/**
 * Peças do painel "Início". Linguagem visual contida: número grande só no
 * que é decisão do dia; cor só quando há algo a fazer (âmbar/vermelho);
 * indicador que não carregou mostra "—" com o motivo, nunca 0.
 */

export function valorOuTraco(indicador: Indicador, formatar: (n: number) => string = (n) => String(n)): string {
  return indicador.ok ? formatar(indicador.valor) : "—";
}

interface ItemAtencaoProps {
  label: string;
  descricao?: string;
  indicador: Indicador;
  href: string;
  icon: LucideIcon;
  /** Tom quando o valor é > 0. */
  tom?: "alerta" | "critico" | "neutro";
  vazio?: string;
}

/** Linha de "Precisa de você": clicável até os registros que compõem o número. */
export function ItemAtencao({ label, descricao, indicador, href, icon: Icon, tom = "alerta", vazio }: ItemAtencaoProps) {
  const temAlgo = indicador.ok && indicador.valor > 0;
  const tomClasse = !temAlgo ? "text-muted-foreground" : tom === "critico" ? "text-danger" : tom === "alerta" ? "text-warning-text" : "text-foreground";
  return (
    <li>
      <Link
        href={href}
        className="group flex min-h-14 items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary/60 focus-visible:bg-secondary/60 focus-visible:outline-none"
        title={indicador.ok ? undefined : `Não foi possível carregar: ${indicador.motivo}`}
      >
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", temAlgo ? (tom === "critico" ? "bg-danger-soft" : tom === "alerta" ? "bg-warning-soft" : "bg-secondary") : "bg-secondary")}>
          <Icon className={cn("h-[18px] w-[18px]", tomClasse)} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-foreground">{label}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {!indicador.ok ? "Indisponível agora" : indicador.valor === 0 && vazio ? vazio : descricao}
          </span>
        </span>
        <span className={cn("text-xl font-semibold tabular-nums tracking-tight", temAlgo ? tomClasse : "text-muted-foreground")}>
          {valorOuTraco(indicador)}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </Link>
    </li>
  );
}

interface KpiProps {
  label: string;
  indicador: Indicador;
  formatar?: (n: number) => string;
  href?: string;
}

/** Número do dia — compacto, sem ícone decorativo. */
export function Kpi({ label, indicador, formatar, href }: KpiProps) {
  const conteudo = (
    <>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="mt-1 block text-2xl font-semibold tabular-nums tracking-tight text-foreground">{valorOuTraco(indicador, formatar)}</span>
      {!indicador.ok && <span className="mt-0.5 block truncate text-[11px] text-muted-foreground" title={indicador.motivo}>Indisponível</span>}
    </>
  );
  const classe = "block rounded-card border border-border bg-card p-4 shadow-card transition-shadow";
  return href ? (
    <Link href={href} className={cn(classe, "hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}>{conteudo}</Link>
  ) : (
    <div className={classe}>{conteudo}</div>
  );
}

export function Secao({ titulo, acao, children }: { titulo: string; acao?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-[13px] font-semibold text-foreground">{titulo}</h2>
        {acao}
      </div>
      {children}
    </section>
  );
}
