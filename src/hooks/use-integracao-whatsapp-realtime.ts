"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { IntegracaoWhatsapp } from "@/types";

/**
 * Assina mudanças em tempo real na linha de integração do WhatsApp —
 * status e QR Code atualizam na tela sozinhos, sem precisar recarregar a
 * página. O Bridge escreve no banco (via API route), o Supabase Realtime
 * avisa o navegador, o React re-renderiza.
 */
export function useIntegracaoWhatsappRealtime(inicial: IntegracaoWhatsapp | null) {
  const [integracao, setIntegracao] = useState(inicial);

  useEffect(() => {
    if (!inicial?.id) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`integracao-whatsapp-${inicial.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "integracoes_whatsapp", filter: `id=eq.${inicial.id}` },
        (payload) => setIntegracao(payload.new as IntegracaoWhatsapp)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [inicial?.id]);

  return integracao;
}
