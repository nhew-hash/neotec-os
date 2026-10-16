"use client";

import { useEffect, useRef, useState } from "react";
import { extrairImei } from "@/services/push/push";

/**
 * Câmera lendo o código de barras do IMEI (caixa, etiqueta da gaveta do chip
 * ou tela do *#06#). Usa ZXing, que funciona também no iPhone (o Safari não
 * tem leitor nativo). Para quando acha um IMEI válido (15 dígitos + Luhn).
 */
export function LeitorImei({ onLido }: { onLido: (imei: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [lendo, setLendo] = useState(true);
  const lidoRef = useRef(onLido);
  lidoRef.current = onLido;

  useEffect(() => {
    let controles: { stop: () => void } | null = null;
    let cancelado = false;
    (async () => {
      try {
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([import("@zxing/browser"), import("@zxing/library")]);
        const dicas = new Map();
        dicas.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.EAN_13, BarcodeFormat.QR_CODE, BarcodeFormat.DATA_MATRIX]);
        dicas.set(DecodeHintType.TRY_HARDER, true);
        const leitor = new BrowserMultiFormatReader(dicas);
        if (cancelado || !video.current) return;
        controles = await leitor.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false },
          video.current,
          (resultado) => {
            if (!resultado) return;
            const imei = extrairImei(resultado.getText());
            if (!imei) return;
            controles?.stop();
            setLendo(false);
            if (navigator.vibrate) navigator.vibrate(80);
            lidoRef.current(imei);
          },
        );
        if (cancelado) controles.stop();
      } catch (err) {
        const nome = (err as { name?: string }).name;
        setErro(nome === "NotAllowedError" ? "Sem permissão para a câmera. Libere nas configurações do navegador e tente de novo." : nome === "NotFoundError" ? "Nenhuma câmera encontrada neste aparelho." : `Não foi possível abrir a câmera: ${err instanceof Error ? err.message : "erro desconhecido"}`);
        setLendo(false);
      }
    })();
    return () => { cancelado = true; controles?.stop(); };
  }, []);

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-xl bg-black">
        <video ref={video} className="aspect-[4/3] w-full object-cover" muted playsInline autoPlay aria-label="Câmera lendo o código de barras" />
        {lendo && <div className="pointer-events-none absolute inset-x-6 top-1/2 h-0.5 -translate-y-1/2 bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.9)]" aria-hidden />}
      </div>
      {erro ? <p role="alert" className="text-sm text-danger">{erro}</p> : lendo && <p className="text-xs text-muted-foreground">Aponte para o código de barras do IMEI (na caixa, na gaveta do chip ou na tela do *#06#).</p>}
    </div>
  );
}
