"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Rede de segurança contra um bug conhecido do Radix UI (biblioteca por
 * trás de todo Dropdown/Dialog/Sheet do sistema, incluindo o menu do
 * usuário no topbar — o único menu de "3 pontinhos" existente hoje):
 * enquanto uma camada (DropdownMenu, Dialog, Sheet) está aberta, o Radix
 * aplica `pointer-events: none` no `<body>` pra travar a interação com o
 * resto da página. Isso é desfeito quando a camada fecha — mas se algo
 * interrompe esse ciclo no meio (o exemplo real: um item de menu que
 * dispara uma navegação assíncrona, como "Sair", sem fechar o menu
 * explicitamente antes), o `<body>` pode ficar com `pointer-events: none`
 * PRA SEMPRE, mesmo depois de trocar de página — a interface toda para
 * de responder a toque/clique, o que parece (e é relatado como) a tela
 * "travando".
 *
 * Esse hook roda a cada troca de rota e só age quando NENHUMA camada do
 * Radix está de fato aberta — nunca interfere com um modal que devia
 * continuar na tela. Ele é só uma rede de segurança: a causa raiz
 * conhecida (navegação disparada de dentro de um item de menu sem
 * fechar a camada antes) já foi corrigida onde existe hoje
 * (`user-menu.tsx`); isso aqui garante que a interface nunca fica presa
 * mesmo se um caso parecido aparecer em outro menu no futuro.
 */
export function useRadixOverlaySafetyNet() {
  const pathname = usePathname();

  useEffect(() => {
    const existeCamadaAberta =
      document.querySelectorAll('[role="dialog"], [role="menu"], [role="listbox"], [data-radix-popper-content-wrapper]').length > 0;

    if (!existeCamadaAberta && document.body.style.pointerEvents === "none") {
      document.body.style.pointerEvents = "";
    }
  }, [pathname]);
}
