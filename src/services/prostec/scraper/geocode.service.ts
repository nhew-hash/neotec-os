import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Resolve cidade/UF pra lat/lon — primeiro no cache
 * (`prostec_geocode_cache`), só chama o Nominatim (OpenStreetMap,
 * grátis) quando não acha. Respeita o limite de 1 req/s do Nominatim
 * (uso "leve" da API pública — ver política de uso deles).
 */

export interface Coordenadas {
  lat: number;
  lon: number;
}

function chaveDe(cidade: string, uf?: string): string {
  const normalizado = (texto: string) =>
    texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  return [normalizado(cidade), uf ? normalizado(uf) : ""].filter(Boolean).join("|");
}

let ultimaChamadaNominatim = 0;
async function respeitarLimiteNominatim(): Promise<void> {
  const agora = Date.now();
  const decorrido = agora - ultimaChamadaNominatim;
  const minimoMs = 1100; // 1 req/s + folga
  if (decorrido < minimoMs) await new Promise((resolve) => setTimeout(resolve, minimoMs - decorrido));
  ultimaChamadaNominatim = Date.now();
}

async function buscarNominatim(cidade: string, uf?: string): Promise<Coordenadas | null> {
  await respeitarLimiteNominatim();
  const query = [cidade, uf, "Brasil"].filter(Boolean).join(", ");
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "NeotecOS-Prostec/1.0 (contato: suporte@neotec.com.br)" },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as Array<{ lat: string; lon: string }>;
    const primeiro = json?.[0];
    if (!primeiro) return null;
    return { lat: Number(primeiro.lat), lon: Number(primeiro.lon) };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function geocodificar(cidade: string, uf?: string): Promise<Coordenadas | null> {
  const chave = chaveDe(cidade, uf);
  const admin = createAdminClient();

  const { data: cache } = await admin.from("prostec_geocode_cache").select("lat, lon").eq("chave", chave).maybeSingle();
  if (cache) return { lat: Number(cache.lat), lon: Number(cache.lon) };

  const coords = await buscarNominatim(cidade, uf);
  if (!coords) return null;

  // upsert com onConflict: duas buscas geocodificando a mesma
  // cidade quase ao mesmo tempo não devem dar erro de PK duplicada.
  await admin.from("prostec_geocode_cache").upsert(
    { chave, lat: coords.lat, lon: coords.lon, fonte: "nominatim" },
    { onConflict: "chave", ignoreDuplicates: true }
  );
  return coords;
}
