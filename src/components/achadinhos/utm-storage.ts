/**
 * Guarda as UTMs da PRIMEIRA página do Achadinhos que a pessoa abriu na
 * sessão (sessionStorage, por aba — some quando a aba fecha). Sem isso, quem
 * chega num anúncio em /achadinhos?utm_campaign=x e navega pro produto
 * perderia a campanha antes do clique de compra. Só UTMs: nada pessoal.
 */
const CHAVE = "achadinhos_utm";
export const CHAVES_UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;
export type Utms = Partial<Record<(typeof CHAVES_UTM)[number], string>>;

function utmsDaUrl(search: string): Utms {
  const params = new URLSearchParams(search);
  const utms: Utms = {};
  for (const k of CHAVES_UTM) {
    const v = params.get(k);
    if (v) utms[k] = v.slice(0, 120);
  }
  return utms;
}

export function capturarUtms(search: string = window.location.search) {
  const utms = utmsDaUrl(search);
  if (Object.keys(utms).length === 0) return;
  try {
    sessionStorage.setItem(CHAVE, JSON.stringify(utms));
  } catch {
    /* storage bloqueado (modo privado etc.): segue sem guardar */
  }
}

/** UTMs da URL atual; se não houver, as guardadas na sessão. */
export function lerUtms(search: string = window.location.search): Utms {
  const daUrl = utmsDaUrl(search);
  if (Object.keys(daUrl).length > 0) return daUrl;
  try {
    const salvo = sessionStorage.getItem(CHAVE);
    return salvo ? (JSON.parse(salvo) as Utms) : {};
  } catch {
    return {};
  }
}
