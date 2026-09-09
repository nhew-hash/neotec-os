/** Função pura, sem nenhum import de servidor — segura de usar em client component, diferente do resto de lacrados-publico.service.ts (que usa next/headers). */
export function slugify(nome: string): string {
  return nome
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
