/**
 * Camada de pagamento desacoplada do Crediário — nunca amarra o
 * sistema a um único banco/gateway. Boleto e Pix são meios
 * diferentes, mas o resto do módulo (parcelas, cobrança, dashboard)
 * só conhece essa interface.
 */
export interface CrediarioPaymentProvider {
  gerarBoleto(input: { parcelaId: string; valor: number; vencimento: string; nomeCliente: string; cpfCliente: string }): Promise<{ idExterno: string; boletoUrl: string; linhaDigitavel: string }>;
  gerarPix(input: { parcelaId: string; valor: number; nomeCliente: string }): Promise<{ idExterno: string; copiaCola: string; qrCodeBase64: string | null }>;
  consultarStatus(idExterno: string): Promise<{ status: "pendente" | "confirmado" | "falhou" | "estornado" }>;
  segundaVia(idExterno: string): Promise<{ boletoUrl?: string; copiaCola?: string }>;
}
