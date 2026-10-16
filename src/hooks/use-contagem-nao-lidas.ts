"use client";

import { useEffect, useId, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Mantém o total de conversas com mensagem não lida atualizado em tempo
 * real — usado no badge "Comunicação (5)" do menu. Reconta do zero a
 * cada mudança em vez de tentar acumular incrementos (mais simples, e o
 * volume de conversas de uma loja não justifica otimizar isso).
 */
export function useContagemNaoLidas(inicial: number) {
  const [contagem, setContagem] = useState(inicial);
  // Nome de canal único por instância: sidebar e barra inferior usam este
  // hook ao mesmo tempo, e dois canais com o mesmo nome no mesmo client
  // (singleton do @supabase/ssr) disputavam a assinatura.
  const idCanal = useId();

  useEffect(() => {
    setContagem(inicial);
  }, [inicial]);

  useEffect(() => {
    const supabase = createClient();

    async function recontar() {
      // Só a contagem (head), sem baixar as linhas — isto roda a cada mensagem recebida.
      const { count, error } = await supabase.from("whatsapp_conversas").select("id", { count: "exact", head: true }).gt("nao_lidas", 0);
      if (!error && count != null) setContagem(count);
    }

    // Uma mensagem nova mexe na conversa várias vezes seguidas (não lidas,
    // última mensagem, responsável…): reconta uma vez só, 400 ms depois.
    let espera: ReturnType<typeof setTimeout> | null = null;
    const channel = supabase
      .channel(`badge-nao-lidas-${idCanal}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_conversas" }, () => {
        if (espera) clearTimeout(espera);
        espera = setTimeout(() => void recontar(), 400);
      })
      .subscribe();

    return () => {
      if (espera) clearTimeout(espera);
      supabase.removeChannel(channel);
    };
  }, [idCanal]);

  return contagem;
}
