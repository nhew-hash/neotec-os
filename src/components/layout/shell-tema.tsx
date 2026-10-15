"use client";

import { useEffect } from "react";

/**
 * Modais, menus e sheets do Radix renderizam em portal direto no <body>,
 * fora do wrapper `.neotec-os` do layout — sem isto eles ficariam com os
 * tokens antigos. Aplica o escopo no <body> só enquanto o sistema interno
 * está montado (login, portal e loja não são afetados).
 */
export function ShellTema() {
  useEffect(() => {
    document.body.classList.add("neotec-os");
    return () => document.body.classList.remove("neotec-os");
  }, []);
  return null;
}
