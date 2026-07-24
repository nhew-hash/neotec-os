import type { PrintProvider, ResultadoImpressao } from "./print-provider.types";

/**
 * Sempre disponível (todo navegador imprime) — é o fallback garantido
 * quando o QZ Tray não está instalado/rodando. Abre a URL de impressão
 * numa aba nova; o próprio Ctrl+P do navegador cuida do resto, incluindo
 * a escolha manual de impressora pelo usuário.
 */
export class BrowserPrintProvider implements PrintProvider {
  readonly nome = "Navegador";

  async disponivel(): Promise<boolean> {
    return true;
  }

  async listarImpressoras(): Promise<string[]> {
    // Navegador não expõe a lista de impressoras do sistema por questão
    // de privacidade — o próprio diálogo de impressão mostra isso.
    return [];
  }

  async imprimir(input: { html: string }): Promise<ResultadoImpressao> {
    const janela = window.open("", "_blank");
    if (!janela) {
      return { sucesso: false, motivo: "O navegador bloqueou a janela de impressão (popup). Permita popups pra esse site." };
    }

    janela.document.write(input.html);
    janela.document.close();
    janela.focus();
    // Pequeno atraso — dá tempo do HTML (e eventual imagem do QR Code, base64) renderizar antes do print.
    setTimeout(() => janela.print(), 300);

    return { sucesso: true };
  }
}
