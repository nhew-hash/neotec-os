import { listarHistoricoPreco } from "@/services/estoque/preco-venda-historico.service";
import { formatCurrency, formatDateTime } from "@/utils";

/** Fase 257 — histórico real de alterações de preço, mais recente primeiro. Some se nunca houve alteração (não mostra "sem histórico" vazio à toa). */
export async function HistoricoPreco({ entidade, entidadeId }: { entidade: "produto" | "aparelho"; entidadeId: string }) {
  const historico = await listarHistoricoPreco(entidade, entidadeId).catch(() => []);
  if (historico.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Histórico de preço</span>
      <div className="flex flex-col gap-2">
        {historico.map((h) => (
          <div key={h.id} className="text-xs">
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground">{h.usuario_nome ?? "—"}</span>
              <span className="text-muted-foreground">{formatDateTime(h.criado_em)}</span>
            </div>
            <p className="text-muted-foreground">
              {h.preco_anterior != null ? formatCurrency(h.preco_anterior) : "—"} → <span className="font-medium text-foreground">{formatCurrency(h.preco_novo)}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
