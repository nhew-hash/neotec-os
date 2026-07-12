import { Badge } from "@/components/ui/badge";
import type { StatusAparelho } from "@/types";

const STATUS_CONFIG: Record<StatusAparelho, { label: string; variant: "default" | "warning" | "success" | "secondary" | "danger" }> = {
  recebido: { label: "Recebido", variant: "secondary" },
  teste: { label: "Em teste", variant: "warning" },
  aprovado: { label: "Aprovado", variant: "default" },
  disponivel: { label: "Disponível", variant: "success" },
  reservado: { label: "Reservado", variant: "warning" },
  vendido: { label: "Vendido", variant: "secondary" },
};

export function StatusAparelhoBadge({ status }: { status: StatusAparelho }) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
