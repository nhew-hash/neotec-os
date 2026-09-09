"use client";

import { useState, useEffect } from "react";
import type { AtividadeRecente } from "@/services/analytics/loja-analytics.service";

function tempoRelativo(iso: string): string {
  const segundos = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (segundos < 60) return `há ${segundos}s`;
  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `há ${minutos}min`;
  const horas = Math.floor(minutos / 60);
  return `há ${horas}h`;
}

/** Atualiza sozinho a cada 20s — busca via Server Action, sem precisar de websocket pra V1. */
export function AtividadeTempoReal({ atividadesIniciais }: { atividadesIniciais: AtividadeRecente[] }) {
  const [atividades, setAtividades] = useState(atividadesIniciais);
  const [, forcarRender] = useState(0);

  useEffect(() => {
    const intervaloAtualizarLista = setInterval(async () => {
      const { obterAtividadeRecenteAction } = await import("@/services/analytics/loja-analytics.actions");
      const result = await obterAtividadeRecenteAction();
      if (result.success) setAtividades(result.data);
    }, 20_000);

    // Só pra re-renderizar o "há Xs" mesmo sem novo dado chegar.
    const intervaloRelogio = setInterval(() => forcarRender((n) => n + 1), 5_000);

    return () => { clearInterval(intervaloAtualizarLista); clearInterval(intervaloRelogio); };
  }, []);

  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-danger" />
        </span>
        <h3 className="text-sm font-semibold text-foreground">Atividade agora</h3>
      </div>

      {atividades.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">Nenhuma atividade recente ainda.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {atividades.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 border-b border-black/[0.04] pb-2.5 last:border-0 last:pb-0">
              <span className="text-xs text-foreground">{a.descricao}</span>
              <span className="shrink-0 text-[10px] text-muted-foreground">{tempoRelativo(a.quando)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
