import type { ReactNode } from "react";
import { METADATA_APP, VIEWPORT_APP } from "@/lib/pwa/metadata";

// Quem adiciona à Tela de Início a partir do login também instala o app de verdade.
export const metadata = METADATA_APP;
export const viewport = VIEWPORT_APP;

export default function AuthLayout({ children }: { children: ReactNode }) {
  return children;
}
