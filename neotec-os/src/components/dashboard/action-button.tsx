import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionButtonProps {
  href: string;
  label: string;
  icon: LucideIcon;
  destaque?: boolean;
}

/**
 * Botão de ação grande do dashboard — alvo de toque generoso (mín. 88px de
 * altura), pensado para uso com o polegar em celular, não para mouse.
 */
export function ActionButton({ href, label, icon: Icon, destaque = false }: ActionButtonProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-card border p-4 text-center shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover active:scale-[0.98] active:translate-y-0",
        destaque
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border/70 bg-card text-foreground hover:border-border hover:bg-secondary/60"
      )}
    >
      <Icon className="h-6 w-6" />
      <span className="text-sm font-medium leading-tight">{label}</span>
    </Link>
  );
}
