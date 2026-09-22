import { Radar } from "lucide-react";
import { listarBuscasAction } from "@/services/prostec/scraper/scraper.actions";
import { BuscasScraperLista, type BuscaJob } from "@/components/prostec/captacao/buscas-scraper-lista";

export default async function CaptacaoProstecPage() {
  const result = await listarBuscasAction();
  const buscas = (result.success ? result.data : []) as unknown as BuscaJob[];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Radar className="h-5 w-5 text-primary" />
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">Captação de leads</h1>
          <p className="text-sm text-muted-foreground">Busca automática de empresas no Google Maps — a fila roda uma busca por vez.</p>
        </div>
      </div>

      {!result.success && <p className="text-xs text-danger">{result.error}</p>}

      <BuscasScraperLista buscasIniciais={buscas} />
    </div>
  );
}
