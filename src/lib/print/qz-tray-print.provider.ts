import type { PrintProvider, ResultadoImpressao } from "./print-provider.types";

/**
 * Impressão direta de verdade — sem diálogo, escolhendo a impressora
 * automaticamente. Exige o QZ Tray (https://qz.io) instalado e rodando
 * no computador — isso é infraestrutura local, o servidor sozinho não
 * alcança (mesma razão do Bridge do WhatsApp Web).
 *
 * Conexão SEM certificado digital (modo "não assinado") — o QZ Tray
 * mostra um popup de permissão local na primeira conexão de cada
 * sessão do navegador. Assinatura por certificado (evita esse popup)
 * é possível depois, mas exige um servidor de assinatura próprio —
 * deixado documentado como melhoria futura, não construído agora.
 */
export class QzTrayPrintProvider implements PrintProvider {
  readonly nome = "QZ Tray (impressão direta)";

  private async carregarQz() {
    // Import dinâmico — qz-tray acessa APIs de navegador (WebSocket) no
    // carregamento do módulo, quebraria em Server Component se importado
    // estaticamente no topo do arquivo.
    const qz = (await import("qz-tray")).default;
    return qz;
  }

  private async conectar() {
    const qz = await this.carregarQz();
    if (!qz.websocket.isActive()) {
      await qz.websocket.connect();
    }
    return qz;
  }

  async disponivel(): Promise<boolean> {
    try {
      await this.conectar();
      return true;
    } catch {
      // QZ Tray não instalado, não rodando, ou usuário recusou a conexão.
      return false;
    }
  }

  async listarImpressoras(): Promise<string[]> {
    try {
      const qz = await this.conectar();
      const impressoras = await qz.printers.find();
      return Array.isArray(impressoras) ? impressoras : [impressoras];
    } catch {
      return [];
    }
  }

  async imprimir(input: { html: string; impressora?: string }): Promise<ResultadoImpressao> {
    try {
      const qz = await this.conectar();
      const nomeImpressora = input.impressora ?? (await qz.printers.getDefault());
      const config = qz.configs.create(nomeImpressora);
      const dados = [{ type: "html" as const, format: "plain" as const, data: input.html }];

      await qz.print(config, dados);
      return { sucesso: true };
    } catch (err) {
      return {
        sucesso: false,
        motivo: err instanceof Error ? err.message : "Falha ao imprimir via QZ Tray — confirme se o programa está aberto no computador.",
      };
    }
  }
}
