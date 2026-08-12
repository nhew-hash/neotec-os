import type { CrmFollowup, CrmCard, Cliente } from "@/types";

type FollowupComCard = CrmFollowup & { card: Pick<CrmCard, "id" | "titulo"> | null; cliente: Pick<Cliente, "id" | "nome"> | null };

export interface ItemFollowupUnificado {
  id: string;
  tipo: "followup";
  titulo: string;
  quando: string;
  categoria: "atrasado" | "hoje" | "futuro";
}

/**
 * Função utilitária pura (sem "use client") — precisa ficar separada dos
 * componentes porque Server Components não conseguem chamar diretamente
 * uma função exportada de um arquivo "use client". `contarFollowupsUrgentes`
 * é chamada direto de `app/(sistema)/crm/page.tsx`, que é Server Component.
 *
 * Fase 179 — unificado: só existe um tipo de follow-up agora (crm_followups,
 * vinculado a um card OU direto a um cliente). O sistema paralelo de
 * "retornos" foi migrado pra cá e não é mais usado.
 */
export function categorizarFollowups(followups: FollowupComCard[]): ItemFollowupUnificado[] {
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

  return followups
    .map((f) => {
      const nomeBase = f.card?.titulo ?? f.cliente?.nome ?? "Cliente";
      return {
        id: f.id, tipo: "followup" as const, titulo: `${nomeBase} — ${f.motivo}`, quando: f.data_agendada,
        categoria: categoriaDe(f.data_agendada),
      };
    })
    .sort((a, b) => a.quando.localeCompare(b.quando));
}

/** Contagem pro badge da aba — só hoje + atrasado conta como "precisa de atenção agora". */
export function contarFollowupsUrgentes(followups: FollowupComCard[]): number {
  return categorizarFollowups(followups).filter((i) => i.categoria !== "futuro").length;
}
