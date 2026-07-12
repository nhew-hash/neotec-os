import Link from "next/link";
import { listarLancamentos, calcularResumo, type PeriodoFiltro } from "@/services/financeiro/financeiro.service";
import { ResumoFinanceiroCards, LancamentosTable, LancamentoForm } from "@/components/financeiro/financeiro-components";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const FILTROS: { value: PeriodoFiltro; label: string }[] = [
  { value: "hoje", label: "Hoje" },
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mês" },
];

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const { periodo: periodoParam } = await searchParams;
  const periodo = (periodoParam as PeriodoFiltro) ?? "mes";

  const [lancamentos, resumo] = await Promise.all([listarLancamentos(periodo), calcularResumo(periodo)]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">Financeiro</h1>
          <p className="text-sm text-muted-foreground">Visível apenas para administradores</p>
        </div>
        <div className="flex gap-1 rounded-md bg-secondary p-1">
          {FILTROS.map((f) => (
            <Link
              key={f.value}
              href={`/financeiro?periodo=${f.value}`}
              className={cn(
                "rounded-sm px-3 py-1.5 text-sm font-medium transition-colors",
                periodo === f.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              )}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </div>

      <ResumoFinanceiroCards resumo={resumo} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardContent className="p-0"><LancamentosTable lancamentos={lancamentos} /></CardContent>
        </Card>
        <Card className="h-fit">
          <CardHeader><CardTitle>Novo lançamento manual</CardTitle></CardHeader>
          <CardContent><LancamentoForm /></CardContent>
        </Card>
      </div>
    </div>
  );
}
