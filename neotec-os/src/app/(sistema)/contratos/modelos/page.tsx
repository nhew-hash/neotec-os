import { AlertTriangle } from "lucide-react";
import { listarModelosContrato } from "@/services/contratos/contrato.service";
import { NovoModeloForm } from "@/components/contratos/novo-modelo-form";
import { formatDate } from "@/utils";

export default async function ModelosContratoPage() {
  const modelos = await listarModelosContrato();
  const ativo = modelos.find((m) => m.ativo);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Modelos de contrato</h1>
        <p className="text-sm text-muted-foreground">O modelo ativo é usado sempre que um contrato novo é gerado</p>
      </div>

      {ativo && !ativo.revisado_juridicamente && (
        <div className="flex items-center gap-2 rounded-2xl border border-danger/30 bg-danger/5 p-3 text-xs text-danger">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          O modelo ativo ainda NÃO foi marcado como revisado juridicamente. Todo contrato gerado agora vai levar o aviso de rascunho.
        </div>
      )}

      <NovoModeloForm modeloAtivo={ativo ?? null} />

      <div className="rounded-2xl border border-black/[0.06] bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/[0.06] text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="p-3 font-medium">Nome</th>
              <th className="p-3 font-medium">Versão</th>
              <th className="p-3 font-medium">Jurídico</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Criado</th>
            </tr>
          </thead>
          <tbody>
            {modelos.map((m) => (
              <tr key={m.id} className="border-b border-black/[0.04] last:border-0">
                <td className="p-3 text-foreground">{m.nome}</td>
                <td className="p-3 text-muted-foreground">{m.versao}</td>
                <td className="p-3">{m.revisado_juridicamente ? "✅ Revisado" : "⚠ Rascunho"}</td>
                <td className="p-3">{m.ativo ? <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success-text">Ativo</span> : "—"}</td>
                <td className="p-3 text-xs text-muted-foreground">{formatDate(m.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
