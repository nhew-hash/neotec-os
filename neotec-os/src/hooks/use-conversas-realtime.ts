"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { tocarSomNotificacao } from "@/hooks/use-preferencias-notificacao";
import type { WhatsappConversa, WhatsappMensagem } from "@/types";
import type { ConversaComCliente } from "@/services/whatsapp/whatsapp.service";

/**
 * Assina conversas em tempo real — nova conversa aparece na lista, e
 * contador de não lidas atualiza sozinho, sem F5. Também dispara uma
 * notificação do navegador quando chega mensagem nova e a aba não está
 * em foco (pede permissão uma vez, silenciosamente ignora se negada).
 */
export function useConversasRealtime(iniciais: ConversaComCliente[]) {
  const [conversas, setConversas] = useState(iniciais);
  const conversasRef = useRef(conversas);
  conversasRef.current = conversas;

  useEffect(() => {
    setConversas(iniciais);
  }, [iniciais]);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      void Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();

    const channelConversas = supabase
      .channel("comunicacao-conversas")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_conversas" },
        (payload) => {
          if (payload.eventType === "DELETE") return;
          const atualizada = payload.new as WhatsappConversa;

          setConversas((prev) => {
            const existente = prev.find((c) => c.id === atualizada.id);
            const mesclada: ConversaComCliente = { ...atualizada, cliente: existente?.cliente ?? null };
            const semEla = prev.filter((c) => c.id !== atualizada.id);
            return [mesclada, ...semEla].sort((a, b) =>
              (b.ultima_mensagem_em ?? "").localeCompare(a.ultima_mensagem_em ?? "")
            );
          });
        }
      )
      .subscribe();

    // Notificação do navegador — só pra mensagem de ENTRADA (cliente
    // mandando), nunca pra mensagem que a própria equipe envia.
    const channelMensagens = supabase
      .channel("comunicacao-notificacoes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "whatsapp_mensagens" },
        (payload) => {
          const mensagem = payload.new as WhatsappMensagem;
          if (mensagem.direcao !== "entrada") return;

          // Lê a preferência aqui (não via hook, pra não criar dependência
          // circular de outro hook dentro deste) — mesma chave de storage.
          let somAtivo = true;
          let notificacaoDesktopAtiva = true;
          try {
            const salvo = localStorage.getItem("neotec-preferencias-notificacao");
            if (salvo) {
              const preferencias = JSON.parse(salvo);
              somAtivo = preferencias.somAtivo ?? true;
              notificacaoDesktopAtiva = preferencias.notificacaoDesktopAtiva ?? true;
            }
          } catch {
            // segue com os padrões
          }

          if (somAtivo) tocarSomNotificacao();

          if (document.visibilityState === "visible") return;
          if (!notificacaoDesktopAtiva) return;
          if (typeof window === "undefined" || !("Notification" in window)) return;
          if (Notification.permission !== "granted") return;

          const conversa = conversasRef.current.find((c) => c.id === mensagem.conversa_id);
          const nomeExibicao = conversa?.cliente?.nome ?? "Novo contato";

          new Notification(`${nomeExibicao} — Neotec OS`, {
            body: mensagem.conteudo ?? "Nova mensagem",
            icon: "/favicon.ico",
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelConversas);
      supabase.removeChannel(channelMensagens);
    };
  }, []);

  return conversas;
}
