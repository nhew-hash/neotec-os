"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Ordem de preferência; o iPhone (Safari) só grava MP4/AAC — pedir WebM lá dava erro
// e o áudio nunca começava. A Bridge converte tudo para OGG/Opus (voz do WhatsApp).
const FORMATOS = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus", "audio/webm"];

function formatoSuportado(): string | undefined {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") return undefined;
  return FORMATOS.find((f) => MediaRecorder.isTypeSupported(f));
}

export type ResultadoGravacao = { blob: Blob; mimeType: string; segundos: number };

/**
 * Gravador de mensagem de voz. `parar(true)` entrega o áudio em `onPronto`;
 * `parar(false)` descarta (cancelar / toque curto demais).
 * Se a pessoa soltar antes do microfone abrir (ex.: pedido de permissão na
 * primeira vez), a gravação é descartada assim que abrir — nada sai sozinho.
 */
export function useGravadorAudio(onPronto: (r: ResultadoGravacao) => void) {
  const [gravando, setGravando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const partes = useRef<Blob[]>([]);
  const inicio = useRef(0);
  const enviarAoParar = useRef(false);
  const pedidoParar = useRef<boolean | null>(null);
  const iniciando = useRef(false);
  const prontoRef = useRef(onPronto);
  prontoRef.current = onPronto;

  useEffect(() => {
    if (!gravando) return;
    const t = setInterval(() => setSegundos(Math.floor((Date.now() - inicio.current) / 1000)), 250);
    return () => clearInterval(t);
  }, [gravando]);

  const parar = useCallback((enviar: boolean) => {
    if (iniciando.current) { pedidoParar.current = enviar; return; }
    const r = recorder.current;
    if (!r || r.state === "inactive") return;
    enviarAoParar.current = enviar;
    r.stop();
  }, []);

  /** Lança erro com mensagem clara (sem permissão, sem microfone, navegador sem suporte). */
  const iniciar = useCallback(async (): Promise<"gravando" | "descartado"> => {
    if (recorder.current?.state === "recording" || iniciando.current) return "gravando";
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") throw new Error("Este navegador não grava áudio.");
    iniciando.current = true;
    pedidoParar.current = null;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (err) {
      iniciando.current = false;
      const nome = (err as { name?: string }).name;
      throw new Error(nome === "NotAllowedError" ? "Sem permissão para o microfone. Libere nas configurações do navegador." : nome === "NotFoundError" ? "Nenhum microfone encontrado." : "Não foi possível abrir o microfone.");
    }
    const formato = formatoSuportado();
    const r = formato ? new MediaRecorder(stream, { mimeType: formato }) : new MediaRecorder(stream);
    partes.current = [];
    r.ondataavailable = (e) => { if (e.data.size > 0) partes.current.push(e.data); };
    r.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      setGravando(false);
      const duracao = (Date.now() - inicio.current) / 1000;
      if (enviarAoParar.current && partes.current.length > 0) {
        const tipo = r.mimeType || formato || "audio/webm";
        prontoRef.current({ blob: new Blob(partes.current, { type: tipo }), mimeType: tipo, segundos: duracao });
      }
      recorder.current = null;
    };
    recorder.current = r;
    inicio.current = Date.now();
    setSegundos(0);
    r.start(250);
    setGravando(true);
    iniciando.current = false;
    // Soltou enquanto o microfone abria: descarta (não manda um áudio vazio/cortado).
    if (pedidoParar.current !== null) { enviarAoParar.current = false; r.stop(); return "descartado"; }
    return "gravando";
  }, []);

  useEffect(() => () => { const r = recorder.current; if (r && r.state !== "inactive") { enviarAoParar.current = false; r.stop(); } }, []);

  return { gravando, segundos, iniciar, parar, duracaoAtual: () => (Date.now() - inicio.current) / 1000 };
}
