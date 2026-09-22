import "server-only";
import Papa from "papaparse";

/**
 * Parse do CSV que o gosom/google-maps-scraper devolve. Os nomes reais
 * das colunas variam um pouco entre versões — por isso a leitura abaixo
 * aceita alguns aliases comuns em vez de travar se um nome mudar.
 */
export interface LeadBruto {
  titulo: string;
  categoria: string | null;
  endereco: string | null;
  telefone: string | null;
  website: string | null;
  emails: string[];
  nota: number | null;
  totalAvaliacoes: number | null;
  latitude: number | null;
  longitude: number | null;
  placeId: string | null;
  cid: string | null;
  link: string | null;
  horarios: string | null;
  status: string | null;
}

function pick(row: Record<string, string>, ...chaves: string[]): string | null {
  for (const chave of chaves) {
    const valor = row[chave];
    if (valor != null && String(valor).trim() !== "") return String(valor).trim();
  }
  return null;
}

function paraNumero(valor: string | null): number | null {
  if (!valor) return null;
  const num = Number(valor.replace(",", "."));
  return Number.isFinite(num) ? num : null;
}

function paraEmails(valor: string | null): string[] {
  if (!valor) return [];
  // O gosom separa múltiplos e-mails por vírgula ou ponto-e-vírgula
  // dependendo da versão; aceita os dois.
  return valor
    .split(/[,;]/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function parseCsvScraper(csvTexto: string): LeadBruto[] {
  const resultado = Papa.parse<Record<string, string>>(csvTexto, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  return resultado.data
    .filter((row) => pick(row, "title", "titulo", "name"))
    .map((row): LeadBruto => ({
      titulo: pick(row, "title", "titulo", "name") ?? "",
      categoria: pick(row, "category", "categoria"),
      endereco: pick(row, "complete_address", "address", "endereco"),
      telefone: pick(row, "phone", "telefone"),
      website: pick(row, "website", "site"),
      emails: paraEmails(pick(row, "emails", "email")),
      nota: paraNumero(pick(row, "review_rating", "rating", "nota")),
      totalAvaliacoes: paraNumero(pick(row, "review_count", "reviews", "total_avaliacoes")) != null
        ? Math.round(paraNumero(pick(row, "review_count", "reviews", "total_avaliacoes"))!)
        : null,
      latitude: paraNumero(pick(row, "latitude", "lat")),
      longitude: paraNumero(pick(row, "longitude", "lon", "lng")),
      placeId: pick(row, "place_id", "placeid"),
      cid: pick(row, "cid"),
      link: pick(row, "link", "google_maps_url", "url"),
      horarios: pick(row, "open_hours", "opening_hours", "horarios"),
      status: pick(row, "status", "business_status"),
    }));
}
