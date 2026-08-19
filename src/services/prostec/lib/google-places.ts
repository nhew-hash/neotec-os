/** Portado do Neotec Prospector original — Places API (New) Text Search. */
import { SEGMENTOS_DISPONIVEIS } from "./settings-padrao";

const PLACES_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
const FIELD_MASK = [
  "places.id", "places.displayName", "places.formattedAddress", "places.nationalPhoneNumber",
  "places.internationalPhoneNumber", "places.websiteUri", "places.rating", "places.userRatingCount",
  "places.googleMapsUri", "places.regularOpeningHours", "places.businessStatus", "nextPageToken",
].join(",");

interface PlacesApiPlace {
  id: string; displayName?: { text?: string }; formattedAddress?: string;
  nationalPhoneNumber?: string; internationalPhoneNumber?: string; websiteUri?: string;
  rating?: number; userRatingCount?: number; googleMapsUri?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[] }; businessStatus?: string;
}
interface PlacesApiResponse { places?: PlacesApiPlace[]; nextPageToken?: string; error?: { message?: string } }

export interface RawCompany {
  name: string; category: string; city: string; state: string; address: string | null;
  phone: string | null; whatsapp: string | null; website: string | null; instagram: string | null;
  facebook: string | null; google_profile_url: string | null; rating: number | null;
  reviews_count: number | null; opening_hours: string | null; source: string;
}

const MAX_PAGES_PER_SEGMENT = 3;
const PAGE_TOKEN_DELAY_MS = 2000;
function sleep(ms: number) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function searchTextPage(apiKey: string, body: Record<string, unknown>): Promise<PlacesApiResponse> {
  const res = await fetch(PLACES_SEARCH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": FIELD_MASK },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as PlacesApiResponse;
  if (!res.ok) throw new Error(json?.error?.message || `HTTP ${res.status}`);
  return json;
}

async function searchSegment(apiKey: string, segment: string, city: string, state: string, remaining: number): Promise<PlacesApiPlace[]> {
  const textQuery = `${segment} em ${city}, ${state}, Brasil`;
  const results: PlacesApiPlace[] = [];
  let pageToken: string | undefined;
  const baseBody = { textQuery, languageCode: "pt-BR", regionCode: "BR", maxResultCount: 20 };

  for (let page = 0; page < MAX_PAGES_PER_SEGMENT && results.length < remaining; page++) {
    if (pageToken) await sleep(PAGE_TOKEN_DELAY_MS);
    const body: Record<string, unknown> = pageToken ? { ...baseBody, pageToken } : baseBody;
    const page_ = await searchTextPage(apiKey, body);
    results.push(...(page_.places ?? []));
    if (!page_.nextPageToken) break;
    pageToken = page_.nextPageToken;
  }
  return results;
}

function mapPlaceToRawCompany(place: PlacesApiPlace, segment: string, city: string, state: string): RawCompany {
  return {
    name: place.displayName?.text || "Empresa sem nome no Google",
    category: segment, city, state,
    address: place.formattedAddress ?? null,
    phone: place.nationalPhoneNumber ?? place.internationalPhoneNumber ?? null,
    whatsapp: null, website: place.websiteUri ?? null, instagram: null, facebook: null,
    google_profile_url: place.googleMapsUri ?? null,
    rating: typeof place.rating === "number" ? place.rating : null,
    reviews_count: typeof place.userRatingCount === "number" ? place.userRatingCount : null,
    opening_hours: place.regularOpeningHours?.weekdayDescriptions?.join(" · ") ?? null,
    source: "Google Places API",
  };
}

export async function buscarEmpresasGooglePlaces(params: { city: string; state: string; segments: string[]; quantity: number }): Promise<RawCompany[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_PLACES_API_KEY não configurada nas variáveis de ambiente.");

  const segments = !params.segments.length || params.segments.includes("Todos os segmentos")
    ? SEGMENTOS_DISPONIVEIS.filter((s) => s !== "Outros")
    : params.segments;

  const perSegmentTarget = Math.max(5, Math.ceil(params.quantity / segments.length));
  const seenPlaceIds = new Set<string>();
  const raw: RawCompany[] = [];

  for (const segment of segments) {
    if (raw.length >= params.quantity) break;
    let places: PlacesApiPlace[];
    try {
      places = await searchSegment(apiKey, segment, params.city, params.state, perSegmentTarget);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Falha ao consultar o Google Places para "${segment}": ${message}. Verifique se a chave é válida, se a "Places API (New)" está ativada e se o billing está habilitado no Google Cloud.`);
    }

    for (const place of places) {
      if (raw.length >= params.quantity) break;
      if (seenPlaceIds.has(place.id)) continue;
      seenPlaceIds.add(place.id);
      if (place.businessStatus && place.businessStatus !== "OPERATIONAL") continue;
      raw.push(mapPlaceToRawCompany(place, segment, params.city, params.state));
    }
  }

  return raw;
}

function normalize(text: string | null | undefined): string {
  if (!text) return "";
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}
function domainOf(url: string | null): string {
  if (!url) return "";
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return normalize(url); }
}
export function buildDedupeKey(company: RawCompany): string {
  const namePart = normalize(company.name).slice(0, 40);
  const phonePart = normalize(company.phone ?? company.whatsapp);
  const addressPart = normalize(company.address).slice(0, 30);
  const domainPart = domainOf(company.website);
  return [namePart, phonePart, addressPart, domainPart].filter(Boolean).join("|");
}
