"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { tocarSomNotificacao } from "@/hooks/use-preferencias-notificacao";

/**
 * Som de mensagem nova com o app aberto, em qualquer tela do sistema (antes só
 * tocava com a lista de conversas aberta). Só mensagem de cliente (entrada).
 * Respeita "Som" em Configurações → Notificações (preferência deste aparelho).
 * Com o app fechado quem toca é o próprio celular, no som padrão de notificação.
 */
export function AvisoSonoroMensagens() {
  useEffect(() => {
    const supabase = createClient();
    let ultimo = 0;
    const canal = supabase
      .channel("aviso-sonoro-mensagens")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "whatsapp_mensagens" }, (payload) => {
        if ((payload.new as { direcao?: string }).direcao !== "entrada") return;
        let somAtivo = true;
        try {
          const salvo = localStorage.getItem("neotec-preferencias-notificacao");
          if (salvo) somAtivo = JSON.parse(salvo).somAtivo ?? true;
        } catch { /* sem armazenamento local: segue com som */ }
        // Várias mensagens seguidas (cliente mandando em rajada) tocam uma vez só.
        if (!somAtivo || Date.now() - ultimo < 3000) return;
        ultimo = Date.now();
        tocarSomNotificacao();
      })
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, []);
  return null;
}
