import type { StatusTone } from "@/components/ui/status-badge";
import type { StatusAvaliacaoTradeIn } from "@/services/trade-in/aplicacao.service";

export const STATUS_LABEL: Record<StatusAvaliacaoTradeIn, string> = {
  estimativa: "Estimativa",
  aguardando_avaliacao: "Aguardando avaliação",
  em_avaliacao: "Em avaliação",
  aprovado: "Aprovado",
  recusado: "Recusado",
  convertido_venda: "Convertido em venda",
  convertido_estoque: "Convertido em estoque",
  cancelado: "Cancelado",
};

export const STATUS_TONE: Record<StatusAvaliacaoTradeIn, StatusTone> = {
  estimativa: "neutral",
  aguardando_avaliacao: "info",
  em_avaliacao: "warning",
  aprovado: "success",
  recusado: "danger",
  convertido_venda: "success",
  convertido_estoque: "success",
  cancelado: "neutral",
};
