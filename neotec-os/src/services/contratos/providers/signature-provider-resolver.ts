import type { SignatureProvider } from "./signature-provider.types";
import { ManualSignatureProvider } from "./manual-signature.provider";

/**
 * Resolve qual provider de assinatura usar. Hoje só existe o manual —
 * quando um provedor real (Clicksign ou outro) for contratado, basta
 * adicionar a implementação concreta e trocar aqui, sem tocar em
 * nenhum outro lugar do módulo de contratos.
 */
export async function getActiveSignatureProvider(): Promise<SignatureProvider> {
  return new ManualSignatureProvider();
}
