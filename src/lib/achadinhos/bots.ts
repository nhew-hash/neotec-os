/**
 * Detecta tráfego automático (robôs de busca, pré-visualização de link do
 * WhatsApp/Facebook, monitoramento, scripts) pra NÃO contar como clique de
 * afiliado — senão um compartilhamento de link no WhatsApp (que o app
 * "abre" pra gerar a miniatura) inflaria as métricas. O user-agent é usado
 * só pra essa decisão e NUNCA é armazenado.
 */
const PADRAO_BOT =
  /bot\b|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|headless|lighthouse|pingdom|uptime|monitor|curl\/|wget\/|python-requests|python-urllib|axios|node-fetch|go-http-client|java\/|libwww|scrapy|httpclient/i;

export function ehTrafegoAutomatico(userAgent: string | null | undefined): boolean {
  if (!userAgent || !userAgent.trim()) return true; // navegador de verdade sempre manda user-agent
  return PADRAO_BOT.test(userAgent);
}
