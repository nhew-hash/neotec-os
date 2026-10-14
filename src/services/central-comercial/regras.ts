import { obterDataHoraBrasilia } from "@/utils/data-brasilia";

/** Regras puras da Central Comercial (checklist, metas, proposta). Sem banco, sem relógio implícito. */

// ---------------------------------------------------------------------------
// Checklist
// ---------------------------------------------------------------------------

export interface ModeloChecklist {
  id: string;
  loja_id: string;
  titulo: string;
  descricao: string | null;
  cargo: string;
  frequencia: "diaria" | "semanal" | "mensal";
  dia_semana: number | null;
  dia_mes: number | null;
  prazo_hora: string; // "HH:MM" ou "HH:MM:SS"
  ativo: boolean;
}

export interface UsuarioAtivo { id: string; cargo: string; loja_id: string }

export interface TarefaGerada {
  loja_id: string;
  modelo_id: string;
  titulo: string;
  descricao: string | null;
  data_ref: string; // YYYY-MM-DD (Brasília)
  responsavel_id: string;
  prazo: string; // ISO UTC
}

export function dataRefBrasilia(agora: Date): string {
  const { ano, mes, dia } = obterDataHoraBrasilia(agora);
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function modeloVale(modelo: ModeloChecklist, ano: number, mes: number, dia: number): boolean {
  if (!modelo.ativo) return false;
  if (modelo.frequencia === "diaria") return true;
  if (modelo.frequencia === "semanal") return modelo.dia_semana !== null && new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay() === modelo.dia_semana;
  // mensal: se o dia pedido não existe no mês (ex.: 31 em abril), vale no último dia do mês
  if (modelo.dia_mes === null) return false;
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  return dia === Math.min(modelo.dia_mes, ultimoDia);
}

/** Tarefas que DEVEM existir para `agora`. A gravação usa unique(modelo, data, responsável): rodar duas vezes não duplica. */
export function gerarTarefasDoDia(modelos: ModeloChecklist[], usuarios: UsuarioAtivo[], agora: Date): TarefaGerada[] {
  const { ano, mes, dia } = obterDataHoraBrasilia(agora);
  const dataRef = dataRefBrasilia(agora);
  const saida: TarefaGerada[] = [];
  for (const m of modelos) {
    if (!modeloVale(m, ano, mes, dia)) continue;
    const [hh, mm] = m.prazo_hora.split(":").map((n) => Number(n));
    const prazo = new Date(Date.UTC(ano, mes - 1, dia, (hh || 0) + 3, mm || 0, 0)); // Brasília = UTC-3
    for (const u of usuarios) {
      if (u.cargo !== m.cargo || u.loja_id !== m.loja_id) continue;
      saida.push({ loja_id: m.loja_id, modelo_id: m.id, titulo: m.titulo, descricao: m.descricao, data_ref: dataRef, responsavel_id: u.id, prazo: prazo.toISOString() });
    }
  }
  return saida;
}

export interface TarefaResumo { status: "pendente" | "concluida" | "dispensada"; prazo: string; responsavel_id: string }

export function situacaoDaTarefa(t: TarefaResumo, agora: Date): "concluida" | "dispensada" | "atrasada" | "no_prazo" {
  if (t.status === "concluida") return "concluida";
  if (t.status === "dispensada") return "dispensada";
  return new Date(t.prazo).getTime() < agora.getTime() ? "atrasada" : "no_prazo";
}

export function resumoPorResponsavel(tarefas: TarefaResumo[], agora: Date): Map<string, { concluidas: number; atrasadas: number; noPrazo: number; total: number }> {
  const mapa = new Map<string, { concluidas: number; atrasadas: number; noPrazo: number; total: number }>();
  for (const t of tarefas) {
    const s = situacaoDaTarefa(t, agora);
    if (s === "dispensada") continue;
    const r = mapa.get(t.responsavel_id) ?? { concluidas: 0, atrasadas: 0, noPrazo: 0, total: 0 };
    r.total += 1;
    if (s === "concluida") r.concluidas += 1;
    else if (s === "atrasada") r.atrasadas += 1;
    else r.noPrazo += 1;
    mapa.set(t.responsavel_id, r);
  }
  return mapa;
}

// ---------------------------------------------------------------------------
// Metas
// ---------------------------------------------------------------------------

export function primeiroDiaDoMes(agora: Date): string {
  const { ano, mes } = obterDataHoraBrasilia(agora);
  return `${ano}-${String(mes).padStart(2, "0")}-01`;
}

export interface ProgressoMeta {
  meta: number | null; // null = nenhuma meta cadastrada: a tela diz "sem meta definida", sem inventar
  realizado: number;
  percentual: number | null;
  faltam: number | null;
  /** Ritmo necessário por dia restante para bater a meta; null sem meta ou mês encerrado. */
  porDiaRestante: number | null;
  diasRestantes: number;
}

export function calcularProgressoMeta(meta: number | null, realizado: number, agora: Date): ProgressoMeta {
  const { ano, mes, dia } = obterDataHoraBrasilia(agora);
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const diasRestantes = Math.max(0, ultimoDia - dia + 1); // conta hoje
  if (!meta || meta <= 0) return { meta: null, realizado, percentual: null, faltam: null, porDiaRestante: null, diasRestantes };
  const faltam = Math.max(0, Math.round((meta - realizado) * 100) / 100);
  return {
    meta, realizado,
    percentual: Math.round((realizado / meta) * 1000) / 10,
    faltam,
    porDiaRestante: faltam > 0 && diasRestantes > 0 ? Math.round((faltam / diasRestantes) * 100) / 100 : null,
    diasRestantes,
  };
}

// ---------------------------------------------------------------------------
// Orçamentos parados
// ---------------------------------------------------------------------------

export function diasParado(desdeIso: string, agora: Date): number {
  return Math.floor((agora.getTime() - new Date(desdeIso).getTime()) / 86_400_000);
}
