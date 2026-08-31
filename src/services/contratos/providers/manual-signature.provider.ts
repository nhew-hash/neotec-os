import type { SignatureProvider } from "./signature-provider.types";

/**
 * Provider "manual" — usado enquanto nenhum provedor real (Clicksign
 * ou equivalente) estiver conectado. Não envia nada de verdade pra
 * fora; o staff atualiza o status da assinatura manualmente (ex:
 * colheu assinatura física, ou usou outro meio fora do sistema).
 *
 * Isso deixa o módulo de contratos usável desde já, sem travar
 * esperando a decisão de qual provedor contratar.
 */
export class ManualSignatureProvider implements SignatureProvider {
  async enviarParaAssinatura(): Promise<{ idExterno: string }> {
    // Sem provider real, não há envelope de verdade — o id é só um
    // marcador local, pra manter o contrato rastreável mesmo assim.
    return { idExterno: `manual-${Date.now()}` };
  }

  async consultarStatus(): Promise<{ status: string; signatarios: { papel: string; status: string; dataHora?: string }[] }> {
    // Sem provider real, o status vem de onde já está salvo no banco
    // (atualizado manualmente pelo staff) — nunca inventa progresso.
    return { status: "pendente", signatarios: [] };
  }

  async baixarDocumentoAssinado(): Promise<Buffer> {
    throw new Error("Sem provider de assinatura real conectado — o documento final precisa ser anexado manualmente em Documentos.");
  }
}
