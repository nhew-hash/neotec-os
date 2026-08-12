"use client";

import Link from "next/link";
import { useState } from "react";
import { Smartphone } from "lucide-react";
import type { OSComCliente } from "@/services/assistencia/assistencia.service";
import { moverParaCrmVendaAction } from "@/services/crm-pipeline/crm-pipeline.actions";

/** Ordem e rótulo amigável — "recebido" vira "OS Criada" (pedido explícito), o resto do fluxo já existia e continua igual. */
const COLUNAS_ASSISTENCIA: { status: string; label: string; cor: string }[] = [
  { status: "recebido", label: "OS Criada", cor: "#8A90A0" },
  { status: "diagnostico", label: "Diagnóstico", cor: "#4CA9D9" },
  { status: "orcamento", label: "Orçamento", cor: "#D97706" },
  { status: "aguardando_aprovacao", label: "Aguardando aprovação", cor: "#E4572E" },
  { status: "em_reparo", label: "Em reparo", cor: "#2643D6" },
  { status: "teste", label: "Teste", cor: "#4CA9D9" },
  { status: "pronto", label: "Pronto", cor: "#16A34A" },
  { status: "entregue", label: "Entregue", cor: "#6B7280" },
  { status: "atendimento_encerrado", label: "Atendimento encerrado", cor: "#16A34A" },
];

export function AssistenciaKanban({ ordens }: { ordens: OSComCliente[] }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {COLUNAS_ASSISTENCIA.map((coluna) => {
        const osDaColuna = ordens.filter((os) => os.status === coluna.status);
        return (
          <div key={coluna.status} className="flex w-72 shrink-0 flex-col gap-2 rounded-2xl bg-secondary/40 p-2">
            <div className="flex items-center justify-between px-1.5 py-1">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: coluna.cor }} />
                {coluna.label}
              </span>
              <span className="text-[11px] text-muted-foreground">{osDaColuna.length}</span>
            </div>

            <div className="flex flex-col gap-2">
              {osDaColuna.map((os) => (
                <CardOS key={os.id} os={os} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CardOS({ os }: { os: OSComCliente }) {
  const [movendo, setMovendo] = useState(false);
  const [movido, setMovido] = useState(false);

  async function handleMoverParaVenda() {
    setMovendo(true);
    await moverParaCrmVendaAction(os.id, os.cliente_id);
    setMovendo(false);
    setMovido(true);
  }

  if (movido) return null; // some da coluna assim que vira card de venda

  return (
    <div className="rounded-xl border border-black/[0.06] bg-white p-3 text-xs shadow-sm">
      <Link href={`/assistencia/${os.id}`} className="font-medium text-foreground hover:underline">
        {os.numero_os}
      </Link>
      <p className="mt-0.5 text-muted-foreground">{os.cliente?.nome}</p>
      {os.aparelho && (
        <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
          <Smartphone className="h-3 w-3" />{os.aparelho.produto?.nome ?? "—"}
        </p>
      )}
      <button
        type="button" onClick={handleMoverParaVenda} disabled={movendo}
        className="mt-2 w-full rounded-md border border-primary/30 py-1 text-[10px] font-medium text-primary hover:bg-primary/5"
      >
        {movendo ? "Movendo..." : "Na verdade é venda →"}
      </button>
    </div>
  );
}
