"use client";

import { useEffect } from "react";

/** Registra o service worker (notificações com o app fechado). Sem cache de páginas. */
export function RegistrarApp() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => {
      console.error("Não foi possível registrar o app (service worker):", err);
    });
  }, []);
  return null;
}
