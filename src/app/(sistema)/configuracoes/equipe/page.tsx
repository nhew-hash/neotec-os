import { Users } from "lucide-react";
import { listarEquipe } from "@/services/equipe/equipe.service";
import { EquipeTable } from "@/components/equipe/equipe-table";
import { NovoFuncionarioForm } from "@/components/equipe/novo-funcionario-form";

export default async function EquipePage() {
  const equipe = await listarEquipe();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">Equipe</h1>
          <p className="text-sm text-muted-foreground">{equipe.length} conta(s) de acesso</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <EquipeTable equipe={equipe} />

        <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Novo funcionário</h2>
          <NovoFuncionarioForm />
        </div>
      </div>
    </div>
  );
}
