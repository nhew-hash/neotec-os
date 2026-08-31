import Link from "next/link";
import { Users } from "lucide-react";
import { listarFiadores } from "@/services/crediario/crediario.service";
import { NovoFiadorForm } from "@/components/crediario/novo-fiador-form";
import { formatDate } from "@/utils";

const LABEL_STATUS: Record<string, string> = { pendente: "Pendente", aprovado: "✅ Aprovado", reprovado: "❌ Reprovado" };

export default async function FiadoresPage() {
  const fiadores = await listarFiadores();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">Fiadores</h1>
          <p className="text-sm text-muted-foreground">{fiadores.length} fiador(es) cadastrado(s)</p>
        </div>
      </div>

      <NovoFiadorForm />

      <div className="rounded-2xl border border-black/[0.06] bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/[0.06] text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="p-3 font-medium">Nome</th><th className="p-3 font-medium">CPF</th>
              <th className="p-3 font-medium">Status</th><th className="p-3 font-medium">Cadastrado</th>
            </tr>
          </thead>
          <tbody>
            {fiadores.map((f) => (
              <tr key={f.id} className="border-b border-black/[0.04] last:border-0 hover:bg-secondary/30">
                <td className="p-3"><Link href={`/crediario/fiadores/${f.id}`} className="font-medium text-primary hover:underline">{f.nome}</Link></td>
                <td className="p-3 text-muted-foreground">{f.cpf}</td>
                <td className="p-3">{LABEL_STATUS[f.status_analise] ?? f.status_analise}</td>
                <td className="p-3 text-xs text-muted-foreground">{formatDate(f.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {fiadores.length === 0 && <p className="py-10 text-center text-xs text-muted-foreground">Nenhum fiador cadastrado ainda.</p>}
      </div>
    </div>
  );
}
