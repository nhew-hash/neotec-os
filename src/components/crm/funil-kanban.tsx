import { ConversaCard } from "./conversa-card";
import type { EtapaFunil } from "@/types";
import type { ConversaComCliente } from "@/services/crm/crm.service";

const COLUNAS: { etapa: EtapaFunil; titulo: string }[] = [
  { etapa: "novo_contato", titulo: "Novo contato" },
  { etapa: "em_atendimento", titulo: "Em atendimento" },
  { etapa: "produto_enviado", titulo: "Produto enviado" },
  { etapa: "orcamento_enviado", titulo: "Orçamento enviado" },
  { etapa: "negociacao", titulo: "Negociação" },
  { etapa: "aguardando_momento", titulo: "Aguardando momento" },
  { etapa: "venda_fechada", titulo: "Venda fechada" },
  { etapa: "perdido", titulo: "Perdido" },
];

export function FunilKanban({ conversas }: { conversas: ConversaComCliente[] }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {COLUNAS.map((coluna) => {
        const itens = conversas.filter((c) => c.etapa_funil === coluna.etapa);
        return (
          <div key={coluna.etapa} className="flex w-64 shrink-0 flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {coluna.titulo}
              </h3>
              <span className="text-xs text-muted-foreground">{itens.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {itens.map((conversa) => (
                <ConversaCard key={conversa.id} conversa={conversa} />
              ))}
              {itens.length === 0 && (
                <div className="rounded-md border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
                  Vazio
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
