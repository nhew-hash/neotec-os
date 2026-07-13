import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface IndicadorCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  href?: string;
  tom?: "neutro" | "alerta" | "sucesso";
}

const TOM_CLASSES: Record<NonNullable<IndicadorCardProps["tom"]>, string> = {
  neutro: "bg-primary/10 text-primary",
  alerta: "bg-warning-soft text-warning",
  sucesso: "bg-success-soft text-success",
};

export function IndicadorCard({ label, value, icon: Icon, href, tom = "neutro" }: IndicadorCardProps) {
  const conteudo = (
    <div
      className={cn(
        "flex items-center gap-3.5 rounded-card border border-border/70 bg-card p-4 shadow-card transition-all",
        href && "hover:-translate-y-0.5 hover:border-border hover:shadow-card-hover"
      )}
    >
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", TOM_CLASSES[tom])}>
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <div className="flex flex-col">
        <span className="font-display text-lg font-semibold leading-tight text-foreground">{value}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  );

  return href ? <Link href={href}>{conteudo}</Link> : conteudo;
}
