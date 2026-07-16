import { cn } from "@/lib/utils";

export type StatusTone = "success" | "warning" | "danger" | "neutral" | "info";

const TONE_CLASSES: Record<StatusTone, string> = {
  success: "bg-success-soft text-success border-success/20",
  warning: "bg-warning-soft text-warning border-warning/20",
  danger: "bg-danger-soft text-danger border-danger/20",
  neutral: "bg-secondary text-secondary-foreground border-transparent",
  info: "bg-primary/10 text-primary border-primary/20",
};

const TONE_DOT: Record<StatusTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  neutral: "bg-muted-foreground",
  info: "bg-primary",
};

interface StatusBadgeProps {
  label: string;
  tone: StatusTone;
  className?: string;
}

/**
 * Badge de status único do sistema — toda tela que mostra "situação de
 * algo" (OS, venda, financeiro, CRM, garantia, consignação...) usa este
 * componente, nunca uma cor escrita na mão. Isso é o que garante que
 * "sucesso" tem a mesma cor em qualquer canto do Neotec OS.
 */
export function StatusBadge({ label, tone, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONE_CLASSES[tone],
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", TONE_DOT[tone])} />
      {label}
    </span>
  );
}
