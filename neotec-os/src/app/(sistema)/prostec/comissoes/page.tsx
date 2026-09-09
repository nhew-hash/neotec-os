import { HandCoins } from "lucide-react";
import { obterComissaoPorVendedor } from "@/services/prostec/prostec.service";
import { formatCurrency } from "@/utils";

export default async function ComissoesProstecPage() {
  const comissoes = await obterComissaoPorVendedor();
  const totalComissao = comissoes.reduce((acc, c) => acc + c.comissaoTotal, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <HandCoins className="h-5 w-5 text-primary" />
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">Comissões — Prostec</h1>
          <p className="text-sm text-muted-foreground">Total acumulado: {formatCurrency(totalComissao)}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-black/[0.06] bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/[0.06] text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="p-3 font-medium">Vendedor</th>
              <th className="p-3 text-right font-medium">Vendas fechadas</th>
              <th className="p-3 text-right font-medium">Faturamento gerado</th>
              <th className="p-3 text-right font-medium">Comissão total</th>
            </tr>
          </thead>
          <tbody>
            {comissoes.map((c) => (
              <tr key={c.usuario_id} className="border-b border-black/[0.04] last:border-0">
                <td className="p-3 font-medium text-foreground">{c.nome}</td>
                <td className="p-3 text-right text-muted-foreground">{c.totalVendas}</td>
                <td className="p-3 text-right text-muted-foreground">{formatCurrency(c.faturamentoGerado)}</td>
                <td className="p-3 text-right font-semibold text-success">{formatCurrency(c.comissaoTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {comissoes.length === 0 && (
          <p className="py-10 text-center text-xs text-muted-foreground">Nenhum vendedor da Prostec cadastrado ainda.</p>
        )}
      </div>
    </div>
  );
}
