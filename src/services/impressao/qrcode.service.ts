import QRCode from "qrcode";

/**
 * QR Code só entra em documentos destinados ao CLIENTE — a via da loja
 * nunca tem QR (decisão explícita do pedido). Aponta pro `/consultar-os`,
 * que já existe e é público (Fase 8) — não precisou criar portal novo
 * pra isso funcionar hoje.
 */
export async function gerarQrCodeDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, { margin: 1, width: 180 });
}

export function urlConsultaPublicaOS(numeroOS: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://neotecos.vercel.app";
  return `${base}/consultar-os?numero=${encodeURIComponent(numeroOS)}`;
}
