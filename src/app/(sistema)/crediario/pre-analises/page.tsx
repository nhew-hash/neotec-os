import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { listarPreAnalises } from "@/services/pre-analise/pre-analise.service";
import { LinkPublicoCard } from "@/components/pre-analise/link-publico-card";
import { formatCurrency, formatDateTime } from "@/utils";

const LABEL_STATUS: Record<string, string> = {
  novo: "Novo", em_analise: "Em análise", contatar_cliente: "Contatar cliente", aguardando_documentos: "Aguardando documentos",
  aprovado: "Aprovado", reprovado: "Reprovado", venda_fechada: "Venda fechada", perdido: "Perdido",
};
const COR_INDICADOR: Record<string, string> = { bom_potencial: "🟢", analise_manual: "🟡", baixo_potencial: "🔴" };

export default async function PreAnalisesPage() {
  const preAnalises = await listarPreAnalises();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-primary" />
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">Pré-análises de Crediário</h1>
          <p className="text-sm text-muted-foreground">{preAnalises.length} recebida(s) pelo formulário público</p>
        </div>
      </div>

      <LinkPublicoCard />

      <div className="rounded-2xl border border-black/[0.06] bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/[0.06] text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="p-3 font-medium">Cliente</th><th className="p-3 font-medium">Aparelho</th>
              <th className="p-3 text-right font-medium">Entrada</th><th className="p-3 text-right font-medium">Parcela</th>
              <th className="p-3 font-medium">Renda</th><th className="p-3 font-medium">Status</th><th className="p-3 font-medium">Recebido</th>
            </tr>
          </thead>
          <tbody>
            {preAnalises.map((p) => (
              <tr key={p.id} className="border-b border-black/[0.04] last:border-0 hover:bg-secondary/30">
                <td className="p-3">
                  <Link href={`/crediario/pre-analises/${p.id}`} className="font-medium text-primary hover:underline">
                    {p.indicador && <span className="mr-1">{COR_INDICADOR[p.indicador]}</span>}{p.nome}
                  </Link>
                </td>
                <td className="p-3 text-muted-foreground">{p.aparelho_desejado}</td>
                <td className="p-3 text-right text-muted-foreground">{formatCurrency(p.entrada)}</td>
                <td className="p-3 text-right text-muted-foreground">{formatCurrency(p.parcela_desejada)}</td>
                <td className="p-3 text-muted-foreground">{formatCurrency(p.renda_mensal)}</td>
                <td className="p-3 text-muted-foreground">{LABEL_STATUS[p.status] ?? p.status}</td>
                <td className="p-3 text-xs text-muted-foreground">{formatDateTime(p.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {preAnalises.length === 0 && <p className="py-10 text-center text-xs text-muted-foreground">Nenhuma pré-análise recebida ainda.</p>}
      </div>
    </div>
  );
}
