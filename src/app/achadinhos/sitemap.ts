import type { MetadataRoute } from "next";
import { urlSite } from "@/lib/achadinhos/apresentacao";
import { listarParaSitemap } from "@/services/achadinhos/achadinhos.publico.service";

export const revalidate = 3600;

/**
 * Sitemap próprio do módulo, em /achadinhos/sitemap.xml (o site principal
 * não tem sitemap hoje, então nada é alterado nele). Lista só produtos
 * ATIVOS e não excluídos — o que a view pública já filtra.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = urlSite();
  const produtos = await listarParaSitemap();
  return [
    { url: `${base}/achadinhos`, changeFrequency: "daily", priority: 0.8 },
    ...produtos.map((p) => ({
      url: `${base}/achadinhos/${p.slug}`,
      lastModified: new Date(p.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
