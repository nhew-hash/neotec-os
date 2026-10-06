"use client";

import { useEffect } from "react";
import { capturarUtms } from "./utm-storage";

/** Sem visual: só guarda as UTMs da entrada pra o clique de compra levar a campanha certa. */
export function CapturarUtm() {
  useEffect(() => {
    capturarUtms();
  }, []);
  return null;
}
