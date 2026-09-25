"use client";

import { useRadixOverlaySafetyNet } from "@/hooks/use-radix-overlay-safety-net";

/**
 * Componente-ponte: `(sistema)/layout.tsx` é um Server Component (precisa
 * ler a sessão/perfil no servidor), então o hook de rede de segurança
 * (que usa `useEffect`/`usePathname`) entra no shell através deste
 * componente cliente sem marca visual (`null`), sem alterar layout algum.
 */
export function RadixOverlaySafetyNet() {
  useRadixOverlaySafetyNet();
  return null;
}
