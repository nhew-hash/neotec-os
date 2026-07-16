import type { CrmFollowup, CrmCard } from "@/types";
import type { RetornoComCliente } from "@/services/crm/crm.service";

type FollowupComCard = CrmFollowup & { card: Pick<CrmCard, "id" | "titulo"> };

export interface ItemFollowupUnificado {
  id: string;
  tipo: "followup" | "retorno";
  titulo: string;
  quando: string;
  categoria: "atrasado" | "hoje" | "futuro";
}

/**
 * Função utilitária pura (sem "use client") — precisa ficar separada dos
 * componentes porque Server Components não conseguem chamar diretamente
 * uma função exportada de um arquivo "use client" (o bundler trata todo
 * export desses arquivos como referência de cliente, mesmo que não seja
 * um componente React). `contarFollowupsUrgentes` é chamada direto de
 * `app/(sistema)/crm/page.tsx`, que é Server Component.
 */
export function categorizarFollowups(
  followups: FollowupComCard[],
  retornos: RetornoComCliente[]
): ItemFollowupUnificado[] {
  const hojeInicio = new Date();
  hojeInicio.setHours(0, 0, 0, 0);
  const hojeFim = new Date(hojeInicio);
  hojeFim.setHours(23, 59, 59, 999);

  function categoriaDe(dataStr: string): ItemFollowupUnificado["categoria"] {
    const data = new Date(dataStr);
    if (data < hojeInicio) return "atrasado";
    if (data <= hojeFim) return "hoje";
    return "futuro";
  }

  return [
    ...followups.map((f) => ({
      id: f.id, tipo: "followup" as const, titulo: f.motivo, quando: f.data_agendada,
      categoria: categoriaDe(f.data_agendada),
    })),
    ...retornos.map((r) => ({
      id: r.id, tipo: "retorno" as const, titulo: `${r.cliente.nome} — ${r.motivo}`, quando: r.data_retorno,
      categoria: categoriaDe(r.data_retorno),
    })),
  ].sort((a, b) => a.quando.localeCompare(b.quando));
}

/** Contagem pro badge da aba — só hoje + atrasado conta como "precisa de atenção agora". */
export function contarFollowupsUrgentes(followups: FollowupComCard[], retornos: RetornoComCliente[]): number {
  return categorizarFollowups(followups, retornos).filter((i) => i.categoria !== "futuro").length;
}
