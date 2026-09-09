import type { ProdutoDestaque } from "@/services/analytics/loja-analytics.service";

export function ProdutosDestaqueTable({ produtos }: { produtos: ProdutoDestaque[] }) {
  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
      <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">🔥 Produtos mais acessados</h3>

      {produtos.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">Ainda sem dados suficientes — vai aparecer aqui conforme a loja recebe acessos.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/[0.06] text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="pb-2 font-medium">Produto</th>
              <th className="pb-2 text-right font-medium">Views</th>
              <th className="pb-2 text-right font-medium">Carrinhos</th>
              <th className="pb-2 text-right font-medium">Vendas</th>
            </tr>
          </thead>
          <tbody>
            {produtos.map((p) => (
              <tr key={p.nome} className="border-b border-black/[0.04] last:border-0">
                <td className="py-2 text-foreground">{p.nome}</td>
                <td className="py-2 text-right text-muted-foreground">{p.visualizacoes}</td>
                <td className="py-2 text-right text-muted-foreground">{p.carrinhos}</td>
                <td className="py-2 text-right font-medium text-success">{p.vendas}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
