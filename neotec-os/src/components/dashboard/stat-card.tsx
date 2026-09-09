import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: "primary" | "success" | "warning";
  helper?: string;
}

const ACCENT_CLASSES: Record<NonNullable<StatCardProps["accent"]>, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
};

export function StatCard({ label, value, icon: Icon, accent = "primary", helper }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between p-5">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          <span className="font-display text-2xl font-semibold leading-none text-foreground">{value}</span>
          {helper && <span className="text-xs text-muted-foreground">{helper}</span>}
        </div>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", ACCENT_CLASSES[accent])}>
          <Icon className="h-[18px] w-[18px]" />
        </div>
      </CardContent>
    </Card>
  );
}
