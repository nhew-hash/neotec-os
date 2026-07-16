import type { StatusVenda, StatusOrcamento } from "@/types";
import type { StatusTone } from "@/components/ui/status-badge";

export const STATUS_VENDA_CONFIG: Record<StatusVenda, { label: string; tone: StatusTone }> = {
  concluida: { label: "Concluída", tone: "success" },
  cancelada: { label: "Cancelada", tone: "danger" },
  estornada: { label: "Estornada", tone: "warning" },
};

export const STATUS_ORCAMENTO_CONFIG: Record<StatusOrcamento, { label: string; tone: StatusTone }> = {
  criado: { label: "Criado", tone: "neutral" },
  enviado: { label: "Enviado", tone: "info" },
  visualizado: { label: "Visualizado", tone: "info" },
  aprovado: { label: "Aprovado", tone: "success" },
  recusado: { label: "Recusado", tone: "danger" },
  expirado: { label: "Expirado", tone: "neutral" },
};
