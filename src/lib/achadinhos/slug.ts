/** Slugs que não podem ser usados por produto (colidem com rotas do módulo). */
export const SLUGS_RESERVADOS = ["ir", "sitemap", "novo"];

export const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** "Fone JBL Tune 510BT — Preto!" → "fone-jbl-tune-510bt-preto". */
export function gerarSlug(texto: string): string {
  const base = texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " e ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
  return base || "produto";
}

export function slugValido(slug: string): boolean {
  return slug.length >= 2 && slug.length <= 80 && SLUG_REGEX.test(slug) && !SLUGS_RESERVADOS.includes(slug);
}

/** Escolhe um slug livre: tenta `base`, depois `base-2`, `base-3`... */
export async function slugUnico(base: string, existe: (slug: string) => Promise<boolean>): Promise<string> {
  const inicial = SLUGS_RESERVADOS.includes(base) ? `${base}-produto` : base;
  if (!(await existe(inicial))) return inicial;
  for (let i = 2; i < 100; i++) {
    const candidato = `${inicial.slice(0, 76)}-${i}`;
    if (!(await existe(candidato))) return candidato;
  }
  throw new Error("Não foi possível gerar um slug único pra esse nome");
}
