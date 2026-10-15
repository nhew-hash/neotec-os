import { inicioDoDiaBrasilia } from "@/utils/data-brasilia";

/**
 * Regras puras do painel "Início". Nenhum limite inventado: "oportunidade
 * parada" usa exatamente a regra que o sistema já tem (Fase 180) — a etapa
 * precisa ter `dias_para_alerta` configurado. Sem isso, a etapa nunca gera
 * alerta, e o painel diz que o alerta não está configurado.
 */
export interface CardParaAlerta {
  id: string;
  etapa_id: string;
  entrou_etapa_em: string;
  perdido: boolean;
}

export interface EtapaComAlerta {
  id: string;
  dias_para_alerta: number | null;
}

const DIA_MS = 24 * 60 * 60 * 1000;

export function diasNaEtapa(entrouEm: string, agora: Date): number {
  return Math.max(0, Math.floor((agora.getTime() - new Date(entrouEm).getTime()) / DIA_MS));
}

export function cardEstaParado(card: CardParaAlerta, etapa: EtapaComAlerta | undefined, agora: Date): boolean {
  if (card.perdido || !etapa || etapa.dias_para_alerta == null) return false;
  return diasNaEtapa(card.entrou_etapa_em, agora) > etapa.dias_para_alerta;
}

export function contarCardsParados(cards: CardParaAlerta[], etapas: EtapaComAlerta[], agora: Date): number {
  const porId = new Map(etapas.map((e) => [e.id, e]));
  return cards.filter((c) => cardEstaParado(c, porId.get(c.etapa_id), agora)).length;
}

/** Janela [início, fim) do dia de hoje em Brasília, em ISO — para filtros `gte`/`lt`. */
export function janelaDeHoje(agora: Date): { inicio: string; fim: string; data: string } {
  const inicio = inicioDoDiaBrasilia(agora);
  const fim = new Date(inicio.getTime() + DIA_MS);
  // Data civil (YYYY-MM-DD) de Brasília, para colunas `date` (ex.: prazo da OS).
  const data = new Date(inicio.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return { inicio: inicio.toISOString(), fim: fim.toISOString(), data };
}
