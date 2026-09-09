"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { atualizarStatusLeadProstecAction } from "@/services/prostec/prostec.actions";
// Tipo duplicado aqui de propósito — import (mesmo "type") de
// prostec.service.ts arrasta o arquivo inteiro (usa next/headers)
// pro bundle do cliente.
interface ProstecLead {
  id: string;
  company_id: string;
  segment: string;
  score: number;
  temperature: "quente" | "morno" | "frio";
  status: string;
  assigned_to: string | null;
  approach_suggestion: string;
  created_at: string;
  company: { name: string; city: string; state: string; phone: string | null; whatsapp: string | null; website: string | null } | null;
}

const COLUNAS = [
  { status: "novo", label: "Novo" },
  { status: "contato_realizado", label: "Contatado" },
  { status: "qualificado", label: "Qualificado" },
  { status: "reuniao", label: "Reunião" },
  { status: "proposta_enviada", label: "Proposta" },
  { status: "negociacao", label: "Negociação" },
  { status: "venda_fechada", label: "Fechado" },
] as const;

const COR_TEMPERATURA: Record<string, string> = { quente: "bg-danger", morno: "bg-warning", frio: "bg-muted-foreground" };

/** Pipeline visual — arrastar não foi implementado (dado o tempo), mas mover de coluna funciona via os botões de seta em cada card. */
export function PipelineKanban({ leads }: { leads: ProstecLead[] }) {
  const [leadsPorColuna, setLeadsPorColuna] = useState(() => {
    const mapa = new Map<string, ProstecLead[]>();
    for (const col of COLUNAS) mapa.set(col.status, leads.filter((l) => l.status === col.status));
    return mapa;
  });
  const [, startTransition] = useTransition();

  function moverLead(lead: ProstecLead, novoStatus: string) {
    setLeadsPorColuna((prev) => {
      const novo = new Map(prev);
      novo.set(lead.status, (novo.get(lead.status) ?? []).filter((l) => l.id !== lead.id));
      novo.set(novoStatus, [{ ...lead, status: novoStatus }, ...(novo.get(novoStatus) ?? [])]);
      return novo;
    });
    startTransition(() => { void atualizarStatusLeadProstecAction(lead.id, novoStatus); });
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {COLUNAS.map((col, colIndex) => {
        const leadsColuna = leadsPorColuna.get(col.status) ?? [];
        return (
          <div key={col.status} className="flex w-64 shrink-0 flex-col gap-2 rounded-2xl bg-secondary/40 p-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-foreground">{col.label}</span>
              <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{leadsColuna.length}</span>
            </div>

            <div className="flex flex-col gap-2">
              {leadsColuna.map((lead) => (
                <div key={lead.id} className="flex flex-col gap-1.5 rounded-xl border border-black/[0.06] bg-white p-2.5 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("h-1.5 w-1.5 rounded-full", COR_TEMPERATURA[lead.temperature])} />
                    <span className="text-[10px] font-semibold text-muted-foreground">{lead.score} pts</span>
                  </div>
                  <Link href={`/prostec/leads/${lead.id}`} className="text-xs font-medium text-foreground hover:text-primary hover:underline">
                    {lead.company?.name ?? "—"}
                  </Link>
                  <span className="text-[10px] text-muted-foreground">{lead.company?.city}</span>

                  <div className="mt-1 flex items-center justify-between">
                    <button
                      type="button" disabled={colIndex === 0}
                      onClick={() => moverLead(lead, COLUNAS[colIndex - 1].status)}
                      className="text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-0"
                    >
                      ← {COLUNAS[colIndex - 1]?.label}
                    </button>
                    <button
                      type="button" disabled={colIndex === COLUNAS.length - 1}
                      onClick={() => moverLead(lead, COLUNAS[colIndex + 1].status)}
                      className="text-[10px] font-medium text-primary hover:underline disabled:opacity-0"
                    >
                      {COLUNAS[colIndex + 1]?.label} →
                    </button>
                  </div>
                </div>
              ))}
              {leadsColuna.length === 0 && <p className="py-4 text-center text-[10px] text-muted-foreground">Nenhum lead aqui</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
