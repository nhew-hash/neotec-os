"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Mantém o total de conversas com mensagem não lida atualizado em tempo
 * real — usado no badge "Comunicação (5)" do menu. Reconta do zero a
 * cada mudança em vez de tentar acumular incrementos (mais simples, e o
 * volume de conversas de uma loja não justifica otimizar isso).
 */
export function useContagemNaoLidas(inicial: number) {
  const [contagem, setContagem] = useState(inicial);

  useEffect(() => {
    setContagem(inicial);
  }, [inicial]);

  useEffect(() => {
    const supabase = createClient();

    async function recontar() {
      const { data } = await supabase.from("whatsapp_conversas").select("nao_lidas").gt("nao_lidas", 0);
      setContagem((data ?? []).length);
    }

    const channel = supabase
      .channel("badge-nao-lidas")
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_conversas" }, () => {
        void recontar();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return contagem;
}
