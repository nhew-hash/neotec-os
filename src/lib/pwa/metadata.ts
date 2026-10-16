import type { Metadata, Viewport } from "next";

/** App instalável no celular (PWA): usado no sistema e no login — não na loja pública. */
export const METADATA_APP: Metadata = {
  manifest: "/neotec-os.webmanifest",
  appleWebApp: { capable: true, title: "Neotec OS", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
  // iOS ainda lê este nome antigo para abrir em tela cheia pelo ícone.
  other: { "apple-mobile-web-app-capable": "yes" },
};
// viewport-fit=cover: no iPhone sem botão, as barras usam env(safe-area-inset-*) para
// não ficarem coladas na barrinha de baixo (indicador) nem atrás do relógio.
export const VIEWPORT_APP: Viewport = { themeColor: "#ffffff", viewportFit: "cover" };
