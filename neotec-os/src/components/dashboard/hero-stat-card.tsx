import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeroStatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  href: string;
  destaque?: "primary" | "success" | "warning";
}

const DESTAQUE_CLASSES: Record<NonNullable<HeroStatCardProps["destaque"]>, string> = {
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
};

/**
 * Tratamento visual deliberadamente diferente do IndicadorCard comum —
 * é o "card grande" pedido pro topo do dashboard (faturamento, vendas,
 * leads, assistência, WhatsApp, IA). Número em display, ícone como marca
 * d'água no canto, não um badge colorido — a hierarquia fica no dado,
 * não na decoração ao redor dele.
 */
export function HeroStatCard({ label, value, icon: Icon, href, destaque = "primary" }: HeroStatCardProps) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col justify-between overflow-hidden rounded-card border border-border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-card-hover"
    >
      <Icon className="absolute -right-3 -top-3 h-20 w-20 text-foreground/[0.04] transition-colors group-hover:text-foreground/[0.06]" />

      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>

      <span className={cn("neotec-dado font-display text-[28px] font-semibold leading-none", DESTAQUE_CLASSES[destaque])}>
        {value}
      </span>
    </Link>
  );
}
