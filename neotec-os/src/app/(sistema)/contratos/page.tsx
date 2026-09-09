import Link from "next/link";
import { FileSignature, Plus, Settings } from "lucide-react";
import { listarContratos } from "@/services/contratos/contrato.service";
import { formatCurrency, formatDate } from "@/utils";

const LABEL_STATUS: Record<string, string> = {
  rascunho: "Rascunho", em_revisao: "Em revisão", aguardando_assinatura: "Aguardando assinatura",
  assinatura_parcial: "Assinatura parcial", assinado: "Assinado", ativo: "Ativo", encerrando: "Encerrando",
  encerrado: "Encerrado", cancelado: "Cancelado", rescindido: "Rescindido",
};
const COR_STATUS: Record<string, string> = {
  rascunho: "bg-secondary text-muted-foreground", assinado: "bg-success/10 text-success-text", ativo: "bg-success/10 text-success-text",
  cancelado: "bg-danger/10 text-danger", rescindido: "bg-danger/10 text-danger", encerrado: "bg-secondary text-muted-foreground",
};

export default async function ContratosPage() {
  const contratos = await listarContratos();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSignature className="h-5 w-5 text-primary" />
          <div>
            <h1 className="font-display text-xl font-semibold text-foreground">Contratos — Neotec Assinatura</h1>
            <p className="text-sm text-muted-foreground">{contratos.length} contrato(s)</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/contratos/modelos" className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"><Settings className="h-3.5 w-3.5" />Modelos</Link>
          <Link href="/contratos/novo" className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"><Plus className="h-3.5 w-3.5" />Novo contrato</Link>
        </div>
      </div>

      <div className="rounded-2xl border border-black/[0.06] bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/[0.06] text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="p-3 font-medium">Número</th>
              <th className="p-3 font-medium">Cliente</th>
              <th className="p-3 font-medium">Aparelho</th>
              <th className="p-3 text-right font-medium">Pagamento</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Criado</th>
            </tr>
          </thead>
          <tbody>
            {contratos.map((c) => (
              <tr key={c.id} className="border-b border-black/[0.04] last:border-0 hover:bg-secondary/30">
                <td className="p-3"><Link href={`/contratos/${c.id}`} className="font-medium text-primary hover:underline">{c.numero}</Link></td>
                <td className="p-3 text-foreground">{c.cliente_nome}</td>
                <td className="p-3 text-muted-foreground">{c.aparelho_descricao ?? "—"}</td>
                <td className="p-3 text-right text-muted-foreground">{c.valor_pagamento ? `${formatCurrency(c.valor_pagamento)} (${c.frequencia_pagamento})` : "—"}</td>
                <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${COR_STATUS[c.status] ?? "bg-secondary text-muted-foreground"}`}>{LABEL_STATUS[c.status] ?? c.status}</span></td>
                <td className="p-3 text-xs text-muted-foreground">{formatDate(c.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {contratos.length === 0 && <p className="py-10 text-center text-xs text-muted-foreground">Nenhum contrato criado ainda.</p>}
      </div>
    </div>
  );
}
