/**
 * Abstração de impressão — roda no NAVEGADOR (diferente do
 * WhatsappProvider, que roda no servidor), porque tanto o diálogo de
 * impressão do navegador quanto o QZ Tray só existem do lado do
 * cliente. O resto do sistema (botões de imprimir nas telas) conversa
 * só com essa interface, nunca importa BrowserPrintProvider/
 * QzTrayPrintProvider diretamente.
 */
export interface PrintProvider {
  readonly nome: string;

  /** Esse provider está pronto pra usar agora? (QZ Tray pode não estar instalado/rodando) */
  disponivel(): Promise<boolean>;

  /** Nomes das impressoras que o sistema operacional enxerga — vazio se o provider não conseguir listar (ex: navegador puro). */
  listarImpressoras(): Promise<string[]>;

  imprimir(input: { html: string; impressora?: string }): Promise<ResultadoImpressao>;
}

export interface ResultadoImpressao {
  sucesso: boolean;
  motivo?: string;
}
