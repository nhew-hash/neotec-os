"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { consultarStatusPagamentoAction } from "@/services/pagamentos/payment.controller";

export type StatusPix = "pendente" | "aprovado" | "recusado" | "cancelado" | "expirado";

/**
 * PaymentHooks — hook de checkout Pix. A UI (componente React) só usa
 * o retorno daqui, nunca fala com Supabase/Server Action diretamente
 * — mantém a regra de "nenhuma lógica de pagamento dentro do componente".
 *
 * Atualização em tempo real via Supabase Realtime (o mesmo padrão já
 * usado em CRM/conversas do sistema) — não fica reconsultando a cada
 * poucos segundos; escuta a mudança de status direto na tabela
 * `pagamentos` e só confirma via Server Action quando o Realtime avisa.
 */
export function usePixStatus(pagamentoId: string | null, statusInicial: StatusPix = "pendente") {
  const [status, setStatus] = useState<StatusPix>(statusInicial);

  useEffect(() => {
    if (!pagamentoId) return;

    const supabase = createClient();
    const canal = supabase
      .channel(`pagamento-${pagamentoId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "pagamentos", filter: `id=eq.${pagamentoId}` }, (payload) => {
        setStatus(payload.new.status as StatusPix);
      })
      .subscribe();

    // Confirmação inicial e de segurança — cobre o caso raro do
    // Realtime não entregar o evento (rede instável, etc.), sem
    // depender só dele pra saber que o Pix foi pago.
    const intervalo = setInterval(async () => {
      const result = await consultarStatusPagamentoAction(pagamentoId);
      if (result.success) setStatus(result.data.status as StatusPix);
    }, 5000);

    return () => {
      supabase.removeChannel(canal);
      clearInterval(intervalo);
    };
  }, [pagamentoId]);

  return status;
}

/** Cronômetro regressivo pro Pix — pura exibição, não interfere na expiração real (isso é controlado pelo Mercado Pago). */
export function useContagemRegressiva(expiraEm: string | null) {
  const [segundosRestantes, setSegundosRestantes] = useState<number | null>(null);

  const calcular = useCallback(() => {
    if (!expiraEm) return null;
    const diff = Math.floor((new Date(expiraEm).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  }, [expiraEm]);

  useEffect(() => {
    setSegundosRestantes(calcular());
    const timer = setInterval(() => setSegundosRestantes(calcular()), 1000);
    return () => clearInterval(timer);
  }, [calcular]);

  if (segundosRestantes == null) return null;
  const minutos = Math.floor(segundosRestantes / 60);
  const segundos = segundosRestantes % 60;
  return `${minutos}:${String(segundos).padStart(2, "0")}`;
}
