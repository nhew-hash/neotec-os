import { OSCard } from "./os-card";
import type { StatusOS } from "@/types";
import type { OSComCliente } from "@/services/assistencia/assistencia.service";

const COLUNAS: { status: StatusOS; titulo: string }[] = [
  { status: "recebido", titulo: "Recebido" },
  { status: "diagnostico", titulo: "Diagnóstico" },
  { status: "orcamento", titulo: "Orçamento" },
  { status: "aguardando_aprovacao", titulo: "Aguardando aprovação" },
  { status: "em_reparo", titulo: "Em reparo" },
  { status: "teste", titulo: "Teste" },
  { status: "pronto", titulo: "Pronto" },
  { status: "entregue", titulo: "Entregue" },
];

export function OSKanban({ ordens }: { ordens: OSComCliente[] }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {COLUNAS.map((coluna) => {
        const itens = ordens.filter((os) => os.status === coluna.status);
        return (
          <div key={coluna.status} className="flex w-60 shrink-0 flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{coluna.titulo}</h3>
              <span className="text-xs text-muted-foreground">{itens.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {itens.map((os) => <OSCard key={os.id} os={os} />)}
              {itens.length === 0 && (
                <div className="rounded-md border border-dashed border-border py-6 text-center text-xs text-muted-foreground">Vazio</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
