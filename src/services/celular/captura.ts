/** Regras puras da captura pelo celular (sem banco) — usadas no servidor e no navegador. */

export type TipoCaptura = "fotos" | "imei";
export type ContextoCaptura = "os" | "trade_in" | "aparelho";

export const ROTULO_CONTEXTO: Record<ContextoCaptura, string> = {
  os: "Ordem de serviço",
  trade_in: "Avaliação de troca",
  aparelho: "Aparelho do estoque",
};

export function rotaDoContexto(tipo: ContextoCaptura, id: string): string {
  if (tipo === "os") return `/assistencia/${id}`;
  if (tipo === "trade_in") return `/trade-in/${id}`;
  return `/estoque/aparelhos/${id}`;
}

/** Pasta das fotos no bucket privado os-fotos: <contexto>/<id>/<arquivo>. */
export function pastaDoContexto(tipo: ContextoCaptura, id: string): string {
  return `${tipo}/${id}`;
}

/** O servidor só aceita caminho dentro da pasta do registro (sem "..", sem subpasta). */
export function caminhoFotoValido(caminho: string, tipo: ContextoCaptura, id: string): boolean {
  const prefixo = `${pastaDoContexto(tipo, id)}/`;
  if (!caminho.startsWith(prefixo)) return false;
  const arquivo = caminho.slice(prefixo.length);
  return /^[A-Za-z0-9_-]{6,80}\.(jpg|jpeg|png|webp)$/.test(arquivo);
}
