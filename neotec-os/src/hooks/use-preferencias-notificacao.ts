"use client";

import { useEffect, useState, useCallback } from "react";

export interface PreferenciasNotificacao {
  somAtivo: boolean;
  notificacaoDesktopAtiva: boolean;
  autoAbrirConversaNova: boolean;
}

const CHAVE_STORAGE = "neotec-preferencias-notificacao";

const PADRAO: PreferenciasNotificacao = {
  somAtivo: true,
  notificacaoDesktopAtiva: true,
  autoAbrirConversaNova: false,
};

/**
 * Preferência de SOM e NOTIFICAÇÃO DESKTOP é, por natureza, do
 * dispositivo/navegador que está aberto — não da loja. Duas pessoas
 * atendendo em dois computadores podem querer configurações diferentes.
 * Por isso fica em `localStorage`, não no banco (diferente de
 * `configuracoes_ia`, que é comportamento da loja inteira). Essa é a
 * única exceção válida à regra geral de não usar localStorage — aqui
 * não é um Artifact isolado, é o app de verdade, e a preferência
 * genuinamente pertence ao navegador, não ao servidor.
 */
export function usePreferenciasNotificacao() {
  const [preferencias, setPreferencias] = useState<PreferenciasNotificacao>(PADRAO);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE_STORAGE);
      if (salvo) setPreferencias({ ...PADRAO, ...JSON.parse(salvo) });
    } catch {
      // localStorage indisponível ou corrompido — segue com o padrão
    }
    setCarregado(true);
  }, []);

  const atualizar = useCallback((mudancas: Partial<PreferenciasNotificacao>) => {
    setPreferencias((prev) => {
      const novo = { ...prev, ...mudancas };
      try {
        localStorage.setItem(CHAVE_STORAGE, JSON.stringify(novo));
      } catch {
        // sem storage disponível — a preferência só vale pra essa sessão
      }
      return novo;
    });
  }, []);

  return { preferencias, atualizar, carregado };
}

/** Toca o som de notificação — um beep curto sintetizado via Web Audio, sem precisar de arquivo de áudio externo. */
export function tocarSomNotificacao() {
  try {
    const AudioContextClasse = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const contexto = new AudioContextClasse();
    const oscilador = contexto.createOscillator();
    const ganho = contexto.createGain();
    oscilador.connect(ganho);
    ganho.connect(contexto.destination);
    oscilador.frequency.value = 880;
    ganho.gain.setValueAtTime(0.15, contexto.currentTime);
    ganho.gain.exponentialRampToValueAtTime(0.001, contexto.currentTime + 0.25);
    oscilador.start();
    oscilador.stop(contexto.currentTime + 0.25);
  } catch {
    // navegador sem suporte a Web Audio — silenciosamente não toca nada
  }
}
