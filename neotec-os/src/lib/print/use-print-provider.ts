"use client";

import { useEffect, useState, useCallback } from "react";
import { BrowserPrintProvider } from "./browser-print.provider";
import { QzTrayPrintProvider } from "./qz-tray-print.provider";
import type { PrintProvider } from "./print-provider.types";

const browserProvider = new BrowserPrintProvider();
const qzProvider = new QzTrayPrintProvider();

export type StatusDeteccaoImpressao = "detectando" | "qz-tray" | "navegador";

/**
 * Detecta se o QZ Tray está instalado e rodando NESTE computador — não
 * é preferência de loja, é característica de cada máquina. Se estiver
 * disponível, usa impressão direta; senão, cai pro navegador
 * (comportamento que já existia, sem quebrar nada).
 */
export function usePrintProvider() {
  const [status, setStatus] = useState<StatusDeteccaoImpressao>("detectando");

  useEffect(() => {
    let cancelado = false;

    qzProvider
      .disponivel()
      .then((disponivel) => {
        if (!cancelado) setStatus(disponivel ? "qz-tray" : "navegador");
      })
      .catch(() => {
        if (!cancelado) setStatus("navegador");
      });

    return () => {
      cancelado = true;
    };
  }, []);

  const provider: PrintProvider = status === "qz-tray" ? qzProvider : browserProvider;

  const imprimir = useCallback(
    async (html: string, impressora?: string) => provider.imprimir({ html, impressora }),
    [provider]
  );

  return { status, provider, imprimir };
}
