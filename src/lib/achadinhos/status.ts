import type { StatusTone } from "@/components/ui/status-badge";
import type { StatusProduto } from "./tipos";

/** Rótulo e cor de cada status — a cor vem do `StatusBadge` do design system, nunca escrita na mão. */
export const STATUS_INFO: Record<StatusProduto, { label: string; tone: StatusTone; descricao: string }> = {
  rascunho: { label: "Rascunho", tone: "info", descricao: "Ainda não aparece no site" },
  ativo: { label: "Ativo", tone: "success", descricao: "Aparece no site" },
  pausado: { label: "Pausado", tone: "warning", descricao: "Fora do site, pode voltar" },
  arquivado: { label: "Arquivado", tone: "neutral", descricao: "Fora do site, só histórico" },
};
