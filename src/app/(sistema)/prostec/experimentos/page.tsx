import { FlaskConical } from "lucide-react";
import { listarExperimentosProstec } from "@/services/prostec/prostec.service";
import { NovoExperimentoForm } from "@/components/prostec/novo-experimento-form";
import { ExperimentoCard } from "@/components/prostec/experimento-card";

export default async function ExperimentosProstecPage() {
  const experimentos = await listarExperimentosProstec();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <FlaskConical className="h-5 w-5 text-primary" />
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">Experimentos (A/B) — Prostec</h1>
          <p className="text-sm text-muted-foreground">Testa mensagens de abordagem diferentes — a Iara nunca declara vencedor com amostra pequena</p>
        </div>
      </div>

      <NovoExperimentoForm />

      <div className="flex flex-col gap-3">
        {experimentos.map((exp) => <ExperimentoCard key={exp.id} experimento={exp} />)}
        {experimentos.length === 0 && <p className="py-10 text-center text-xs text-muted-foreground">Nenhum experimento criado ainda.</p>}
      </div>
    </div>
  );
}
