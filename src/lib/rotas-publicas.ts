/**
 * Rotas que o middleware NUNCA manda para o login. Função pura (testada em
 * `lib/__tests__/rotas-publicas.test.ts`) para a regra não regredir.
 *
 * Casa a rota exata ou um subcaminho dela ("/loja" e "/loja/...") — nunca um
 * prefixo solto. Com `startsWith("/loja")`, `/loja-admin` (painel interno) era
 * tratado como público e escapava do bloqueio por cargo do middleware
 * (investidor/indicador/vendedor_prostec). Mesmo erro que a Fase 263 já tinha
 * corrigido para `/achadinhos`.
 */
export const ROTAS_PUBLICAS = [
  "/login",
  "/portal",
  "/consultar-os",
  "/loja",
  // APIs da vitrine (busca, comparador, rastreamento) — públicas por desenho
  // (ver os próprios route.ts). Fora desta lista, o visitante anônimo recebia
  // redirect para /login: a busca e o comparador da loja só funcionavam para
  // quem estava logado como equipe, e o rastreamento (Analytics da Loja /
  // atribuição) perdia todo visitante real.
  "/api/loja",
  "/impressao",
  "/pre-analise",
  "/api/impressao",
  "/api/whatsapp/webhook",
  "/api/integracoes/whatsapp-web",
  "/api/prostec/whatsapp",
  "/api/cron",
  "/api/mercadopago",
  "/api/banco-imagens/lote",
];

export function isRotaPublica(pathname: string): boolean {
  if (pathname === "/") return true;
  // Fase 263 — Achadinhos da Neotec. O painel admin mora em `/achadinhos-admin`,
  // que NÃO pode ficar público por compartilhar o prefixo. `/api/achadinhos/*`
  // é público só aqui: cada rota da API se autentica sozinha por chave (Bearer).
  if (pathname === "/achadinhos" || pathname.startsWith("/achadinhos/") || pathname.startsWith("/api/achadinhos/")) return true;
  return ROTAS_PUBLICAS.some((rota) => pathname === rota || pathname.startsWith(`${rota}/`));
}
