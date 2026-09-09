import Link from "next/link";
import { listarEmpresasProstec } from "@/services/prostec/prostec.service";
import { NovaEmpresaForm } from "@/components/prostec/nova-empresa-form";

export default async function EmpresasProstecPage() {
  const empresas = await listarEmpresasProstec();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">Empresas prospectadas</h1>
          <p className="text-sm text-muted-foreground">{empresas.length} empresa(s) no total</p>
        </div>
      </div>

      <NovaEmpresaForm />

      <div className="rounded-2xl border border-black/[0.06] bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/[0.06] text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="p-3 font-medium">Empresa</th>
              <th className="p-3 font-medium">Cidade</th>
              <th className="p-3 font-medium">Categoria</th>
              <th className="p-3 font-medium">Contato</th>
              <th className="p-3 text-right font-medium">Score</th>
              <th className="p-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {empresas.map((e) => (
              <tr key={e.id} className="border-b border-black/[0.04] last:border-0 hover:bg-secondary/30">
                <td className="p-3">
                  <p className="font-medium text-foreground">{e.name} {e.is_demo_data && <span className="ml-1 rounded bg-warning/10 px-1.5 py-0.5 text-[10px] text-warning">demo</span>}</p>
                  <p className="text-xs text-muted-foreground">{e.website ?? "sem site"}</p>
                </td>
                <td className="p-3 text-muted-foreground">{e.city}, {e.state}</td>
                <td className="p-3 text-muted-foreground">{e.category}</td>
                <td className="p-3 text-muted-foreground">{e.whatsapp ?? e.phone ?? "—"}</td>
                <td className="p-3 text-right font-medium text-foreground">{e.lead?.score ?? "—"}</td>
                <td className="p-3">
                  {e.lead ? (
                    <Link href={`/prostec/leads/${e.lead.id}`} className="text-xs font-medium text-primary hover:underline">
                      {e.lead.status.replace("_", " ")} →
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">sem lead</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {empresas.length === 0 && (
          <p className="py-10 text-center text-xs text-muted-foreground">Nenhuma empresa ainda — a busca de novas empresas ainda precisa ser configurada.</p>
        )}
      </div>
    </div>
  );
}
