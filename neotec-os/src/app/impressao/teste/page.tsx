"use client";

import { useEffect } from "react";

/**
 * Página de teste — abre o diálogo de impressão do navegador
 * automaticamente. Enquanto a impressão direta (QZ Tray, Fase 3) não
 * existe, "testar impressão" na tela de Configurações abre isso, pra
 * confirmar visualmente que o layout está legível na impressora física.
 */
export default function TesteImpressaoPage() {
  useEffect(() => {
    const timer = setTimeout(() => window.print(), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{ fontFamily: "Arial, sans-serif", maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: "#2643D6" }}>Página de teste — Neotec OS</h1>
      <p>Se você está vendo isso impresso, a impressora está configurada corretamente.</p>
      <p style={{ fontSize: 11, color: "#888" }}>Gerado em {new Date().toLocaleString("pt-BR")}</p>
    </div>
  );
}
