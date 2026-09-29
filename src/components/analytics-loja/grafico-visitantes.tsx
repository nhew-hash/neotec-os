"use client";

import { useState, useEffect, useTransition } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { cn } from "@/lib/utils";
import type { PontoGrafico } from "@/services/analytics/loja-analytics.service";

/**
 * Client Component — troca de período (hoje/7 dias/30 dias) busca dado
 * novo via Server Action, sem recarregar a página inteira.
 *
 * Fase 255: quando o período era "7 dias"/"30 dias", o auto-refresh de
 * 30s da página (`AutoRefreshPainel`) buscava `dadosIniciais` novo no
 * servidor, mas esse componente já tinha inicializado seu próprio
 * estado com `useState(dadosIniciais)` — React não reinicializa state
 * a partir de uma prop que muda depois da 1ª montagem, então o gráfico
 * ficava congelado no período errado até o usuário trocar de aba
 * manualmente. Agora reage a QUALQUER mudança de `dadosIniciais`
 * (nova leitura do servidor) — sincroniza direto se o período é "hoje"
 * (que já vem pronto), ou dispara nova busca do período atual
 * (mantendo o gráfico "hoje"/"7 dias"/"30 dias" sempre atualizado
 * junto com o resto do painel).
 */
export function GraficoVisitantes({ dadosIniciais }: { dadosIniciais: PontoGrafico[] }) {
  const [periodo, setPeriodo] = useState<"hoje" | "7dias" | "30dias">("hoje");
  const [dados, setDados] = useState(dadosIniciais);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (periodo === "hoje") {
      setDados(dadosIniciais);
      return;
    }
    startTransition(async () => {
      const { obterGraficoVisitantesAction } = await import("@/services/analytics/loja-analytics.actions");
      const result = await obterGraficoVisitantesAction(periodo);
      if (result.success) setDados(result.data);
    });
    // dadosIniciais entra nas deps de propósito: é o sinal de "a página
    // buscou dado novo agora" (refresh inicial ou o auto-refresh de
    // 30s), mesmo quando o período atual não é "hoje".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo, dadosIniciais]);

  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Visitantes</h3>
        <div className="flex gap-1 rounded-lg bg-secondary p-1">
          {(["hoje", "7dias", "30dias"] as const).map((p) => (
            <button
              key={p} type="button" onClick={() => setPeriodo(p)}
              className={cn("rounded-md px-3 py-1 text-xs font-medium transition-colors", periodo === p ? "bg-white text-foreground shadow-sm" : "text-muted-foreground")}
            >
              {p === "hoje" ? "Hoje" : p === "7dias" ? "7 dias" : "30 dias"}
            </button>
          ))}
        </div>
      </div>

      <div className={cn("h-64 transition-opacity", isPending && "opacity-50")}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={dados}>
            <defs>
              <linearGradient id="corVisitantes" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2643D6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#2643D6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F1F4" />
            <XAxis dataKey="rotulo" fontSize={11} tickLine={false} axisLine={false} stroke="#8A90A0" />
            <YAxis fontSize={11} tickLine={false} axisLine={false} stroke="#8A90A0" allowDecimals={false} />
            <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #F0F1F4", fontSize: 12 }} />
            <Area type="monotone" dataKey="valor" stroke="#2643D6" strokeWidth={2} fill="url(#corVisitantes)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
