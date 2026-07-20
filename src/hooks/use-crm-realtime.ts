"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Cards do Pipeline dependem de dados combinados (cliente, tags,
 * conversa vinculada) que vêm de junções feitas em `crm-pipeline.service.ts`
 * — o payload puro do Realtime não traz isso pronto. Em vez de duplicar
 * essa lógica de junção no navegador, este hook só "ouve" mudanças em
 * `crm_cards`/`crm_followups` e pede pro Next.js buscar os dados de novo
 * (`router.refresh()`) — mais simples, e a lógica de busca continua
 * existindo só uma vez, no servidor.
 */
export function useCrmRealtime() {
  const router = useRouter();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();

    // Debounce curto — se vários cards mudarem quase juntos (ex: várias
    // mensagens chegando em sequência), atualiza uma vez só, não uma
    // chamada por evento.
    function agendarAtualizacao() {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => router.refresh(), 600);
    }

    const channel = supabase
      .channel("crm-pipeline-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "crm_cards" }, agendarAtualizacao)
      .on("postgres_changes", { event: "*", schema: "public", table: "crm_followups" }, agendarAtualizacao)
      .subscribe();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [router]);
}
