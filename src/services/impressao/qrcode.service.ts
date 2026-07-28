import QRCode from "qrcode";

/**
 * QR Code só entra em documentos destinados ao CLIENTE — a via da loja
 * nunca tem QR (decisão explícita do pedido). Aponta pro /login —
 * pedido explícito, confirmado depois de eu avisar que normalmente
 * seria /consultar-os (acompanhamento público) em vez da tela de
 * login da equipe.
 */
export async function gerarQrCodeDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, { margin: 1, width: 180 });
}

export function urlConsultaPublicaOS(): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://neotecbrasil.com";
  return `${base}/login`;
}
