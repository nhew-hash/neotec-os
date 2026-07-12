import Link from "next/link";
import { Plus } from "lucide-react";
import { listarOrdensServico } from "@/services/assistencia/assistencia.service";
import { OSKanban } from "@/components/assistencia/os-kanban";
import { Button } from "@/components/ui/button";

export default async function AssistenciaPage() {
  const ordens = await listarOrdensServico();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">Assistência Técnica</h1>
          <p className="text-sm text-muted-foreground">{ordens.length} ordem(ns) de serviço</p>
        </div>
        <Button asChild>
          <Link href="/assistencia/nova"><Plus className="h-4 w-4" />Nova OS</Link>
        </Button>
      </div>

      <OSKanban ordens={ordens} />
    </div>
  );
}
