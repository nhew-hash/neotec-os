import { cardEstaParado, diasNaEtapa } from "@/services/dashboard/painel-regras";
import type { CardComRelacoes } from "@/services/crm-pipeline/crm-pipeline.service";

/** Filtros do pipeline (puros, testados). Nada aqui inventa regra: "parada" é o alerta da etapa (Fase 180). */
export interface FiltrosPipeline {
  busca: string;
  somenteMinhas: boolean;
  somenteParadas: boolean;
  mostrarPerdidas: boolean;
  origem: string; // "" = todas
  temperatura: string; // "" = todas
}

export const FILTROS_PADRAO: FiltrosPipeline = { busca: "", somenteMinhas: false, somenteParadas: false, mostrarPerdidas: false, origem: "", temperatura: "" };

function normalizar(t: string): string {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function filtrarCards(cards: CardComRelacoes[], etapas: { id: string; dias_para_alerta?: number | null }[], f: FiltrosPipeline, usuarioId: string, agora: Date): CardComRelacoes[] {
  const porEtapa = new Map(etapas.map((e) => [e.id, { id: e.id, dias_para_alerta: e.dias_para_alerta ?? null }]));
  const termo = normalizar(f.busca.trim());
  const digitos = f.busca.replace(/\D/g, "");
  return cards.filter((c) => {
    if (!f.mostrarPerdidas && c.perdido) return false;
    if (f.somenteMinhas && c.responsavel_id !== usuarioId) return false;
    if (f.origem && c.origem !== f.origem) return false;
    if (f.temperatura && c.cliente?.temperatura !== f.temperatura) return false;
    if (f.somenteParadas && !cardEstaParado(c, porEtapa.get(c.etapa_id), agora)) return false;
    if (termo) {
      const texto = normalizar(`${c.cliente?.nome ?? ""} ${c.titulo} ${c.proxima_acao ?? ""}`);
      const casaTexto = texto.includes(termo);
      const casaFone = digitos.length >= 4 && (c.cliente?.whatsapp ?? "").includes(digitos.slice(-8));
      if (!casaTexto && !casaFone) return false;
    }
    return true;
  });
}

export function resumoColuna(cards: CardComRelacoes[]): { quantidade: number; valor: number } {
  return { quantidade: cards.length, valor: cards.reduce((acc, c) => acc + Number(c.valor_estimado ?? 0), 0) };
}

export { diasNaEtapa, cardEstaParado };
