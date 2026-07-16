import type { StatusOS } from "@/types";
import type { StatusTone } from "@/components/ui/status-badge";

export const STATUS_OS_OPTIONS: { value: StatusOS; label: string; descricaoProximoPasso: string; tone: StatusTone }[] = [
  { value: "recebido", label: "Recebido", descricaoProximoPasso: "Fazer o diagnóstico técnico", tone: "neutral" },
  { value: "diagnostico", label: "Diagnóstico", descricaoProximoPasso: "Definir o orçamento do reparo", tone: "info" },
  { value: "orcamento", label: "Orçamento", descricaoProximoPasso: "Aguardar aprovação do cliente", tone: "info" },
  { value: "aguardando_aprovacao", label: "Aguardando aprovação", descricaoProximoPasso: "Cliente precisa aprovar pra seguir", tone: "warning" },
  { value: "em_reparo", label: "Em reparo", descricaoProximoPasso: "Executar o conserto", tone: "warning" },
  { value: "teste", label: "Teste", descricaoProximoPasso: "Testar antes de liberar", tone: "warning" },
  { value: "pronto", label: "Pronto", descricaoProximoPasso: "Avisar o cliente pra retirada", tone: "success" },
  { value: "entregue", label: "Entregue", descricaoProximoPasso: "Concluído", tone: "neutral" },
];

export const STATUS_OS_LABEL: Record<StatusOS, string> = Object.fromEntries(
  STATUS_OS_OPTIONS.map((s) => [s.value, s.label])
) as Record<StatusOS, string>;

export function toneDoStatusOS(status: StatusOS): StatusTone {
  return STATUS_OS_OPTIONS.find((s) => s.value === status)?.tone ?? "neutral";
}
