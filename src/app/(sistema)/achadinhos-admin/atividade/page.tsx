import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import { descreverLog } from "@/lib/achadinhos/log-texto";
import { listarLog, type FiltroLog } from "@/services/achadinhos/achadinhos.admin.service";

export const metadata = { title: "Atividade dos Achadinhos" };

const FILTROS: { id: FiltroLog; rotulo: string }[] = [
  { id: "alteracoes", rotulo: "Alterações" },
  { id: "problemas", rotulo: "Problemas" },
  { id: "todos", rotulo: "Tudo (inclui consultas)" },
];

export default async function AtividadePage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const { f } = await searchParams;
  const filtro: FiltroLog = FILTROS.some((x) => x.id === f) ? (f as FiltroLog) : "alteracoes";
  const itens = await listarLog(filtro);
  return (
    <div className="space-y-6">
      <PageHeader title="Atividade" description="Tudo o que você e o Claude fizeram no catálogo, do mais recente para o mais antigo." />
      <div className="flex flex-wrap gap-2">
        {FILTROS.map((x) => (
          <Link key={x.id} href={`/achadinhos-admin/atividade?f=${x.id}`}
            className={cn("rounded-full border px-3 py-1 text-sm", filtro === x.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground")}>
            {x.rotulo}
          </Link>
        ))}
      </div>
      {itens.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Nada por aqui ainda.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {itens.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <span>{descreverLog(l)}</span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                {l.resultado !== "sucesso" && <StatusBadge label={l.resultado === "negado" ? "Barrado" : "Erro"} tone={l.resultado === "negado" ? "warning" : "danger"} />}
                <time dateTime={l.criado_em}>{new Date(l.criado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</time>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
