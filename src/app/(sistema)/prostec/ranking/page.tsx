import { Trophy } from "lucide-react";
import { obterRankingVendedores } from "@/services/prostec/prostec.service";
import { RankingVendedoresTable } from "@/components/prostec/ranking-vendedores-table";

const MEDALHAS = ["🏆", "🥈", "🥉"];

export default async function RankingProstecPage() {
  const ranking = await obterRankingVendedores();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-primary" />
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">Ranking — Prostec</h1>
          <p className="text-sm text-muted-foreground">Metas e desempenho do mês</p>
        </div>
      </div>

      {ranking.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Nenhum vendedor da Prostec cadastrado ainda.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {ranking.slice(0, 3).map((v, i) => (
            <div key={v.usuario_id} className="flex flex-col items-center gap-1 rounded-2xl border border-black/[0.06] bg-white p-5 text-center shadow-sm">
              <span className="text-3xl">{MEDALHAS[i]}</span>
              <span className="font-medium text-foreground">{v.nome}</span>
              <span className="font-display text-lg font-bold text-success">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v.faturamentoMes)}</span>
              <span className="text-xs text-muted-foreground">{v.vendasMes} venda{v.vendasMes !== 1 ? "s" : ""}</span>
            </div>
          ))}
        </div>
      )}

      <RankingVendedoresTable ranking={ranking} />
    </div>
  );
}
