/**
 * Camada desacoplada de assinatura eletrônica — o sistema nunca fica
 * amarrado a um fornecedor específico (Clicksign, ou qualquer outro).
 * A escolha do provider é feita depois, configurando qual
 * implementação concreta usar — o resto do módulo de contratos só
 * conhece essa interface.
 */
export interface SignatureProvider {
  /** Cria o envelope/documento no provider e envia pros signatários. Retorna o id externo pra rastrear depois. */
  enviarParaAssinatura(input: {
    contratoId: string;
    pdfBuffer: Buffer;
    nomeDocumento: string;
    signatarios: { nome: string; cpf: string; email?: string; papel: "cliente" | "fiador" | "neotec" }[];
  }): Promise<{ idExterno: string }>;

  /** Consulta o status atual no provider — usado como fallback se o webhook falhar. */
  consultarStatus(idExterno: string): Promise<{ status: string; signatarios: { papel: string; status: string; dataHora?: string }[] }>;

  /** Baixa o documento final assinado (com evidências), pra guardar como imutável. */
  baixarDocumentoAssinado(idExterno: string): Promise<Buffer>;
}

export type StatusAssinaturaProvider = "pendente" | "enviado" | "visualizado" | "assinado" | "recusado" | "expirado" | "cancelado";
