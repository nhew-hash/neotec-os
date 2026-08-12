import type { OrigemAcesso } from "@/services/analytics/loja-analytics.service";

const COR_ORIGEM: Record<string, string> = {
  instagram: "#E1306C", google: "#4285F4", whatsapp: "#25D366",
  meta_ads: "#0866FF", direto: "#8A90A0", outros: "#C9CDD6",
};

export function OrigemAcessos({ origens }: { origens: OrigemAcesso[] }) {
  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
      <h3 className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-foreground">📍 De onde estão vindo</h3>

      {origens.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">Ainda sem dados suficientes.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {origens.map((o) => (
            <div key={o.origem} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-xs text-foreground">{o.label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full" style={{ width: `${o.percentual}%`, backgroundColor: COR_ORIGEM[o.origem] ?? "#8A90A0" }} />
              </div>
              <span className="w-12 shrink-0 text-right text-xs font-medium text-foreground">{o.percentual}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
