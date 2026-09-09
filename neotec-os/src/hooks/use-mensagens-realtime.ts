"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { WhatsappMensagem } from "@/types";

/**
 * Assina mensagens novas (INSERT) da conversa aberta em tempo real —
 * tanto as que a equipe manda quanto as que chegam do cliente aparecem
 * na hora, sem precisar dar F5. Atualização de status de entrega
 * (enviado → entregue → lido) também chega via UPDATE.
 */
export function useMensagensRealtime(conversaId: string, iniciais: WhatsappMensagem[]) {
  const [mensagens, setMensagens] = useState(iniciais);

  useEffect(() => {
    setMensagens(iniciais);
  }, [conversaId, iniciais]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`mensagens-${conversaId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "whatsapp_mensagens", filter: `conversa_id=eq.${conversaId}` },
        (payload) => {
          const nova = payload.new as WhatsappMensagem;
          setMensagens((prev) => (prev.some((m) => m.id === nova.id) ? prev : [...prev, nova]));
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "whatsapp_mensagens", filter: `conversa_id=eq.${conversaId}` },
        (payload) => {
          const atualizada = payload.new as WhatsappMensagem;
          setMensagens((prev) => prev.map((m) => (m.id === atualizada.id ? atualizada : m)));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversaId]);

  return mensagens;
}
