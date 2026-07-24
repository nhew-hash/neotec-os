"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Smartphone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { atualizarStatusTradeInAction } from "@/services/loja/trade-in-staff.actions";
import { formatDateTime, formatWhatsapp } from "@/utils";
import type { SolicitacaoTradeIn, StatusTradeIn } from "@/types";

const STATUS_LABEL: Record<StatusTradeIn, string> = {
  novo: "Novo", em_avaliacao: "Em avaliação", respondido: "Respondido", concluido: "Concluído", descartado: "Descartado",
};

const LABEL_CONDICAO: Record<string, string> = {
  excelente: "Excelente", bom: "Bom", regular: "Regular", ruim: "Ruim",
};

export function TradeInPanel({ solicitacoes }: { solicitacoes: SolicitacaoTradeIn[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleStatus(id: string, status: StatusTradeIn) {
    startTransition(async () => {
      await atualizarStatusTradeInAction(id, status);
      router.refresh();
    });
  }

  if (solicitacoes.length === 0) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Nenhuma solicitação de trade-in ainda.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {solicitacoes.map((s) => (
        <Card key={s.id}>
          <CardContent className="flex flex-col gap-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-foreground">{s.nome_contato}</p>
                <p className="neotec-id-tag mt-0.5 w-fit">{formatWhatsapp(s.telefone_contato)}</p>
              </div>
              <Select value={s.status} onValueChange={(v) => handleStatus(s.id, v as StatusTradeIn)} disabled={isPending}>
                <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABEL) as StatusTradeIn[]).map((st) => (
                    <SelectItem key={st} value={st}>{STATUS_LABEL[st]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 rounded-md bg-secondary p-2.5 text-xs">
              <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-foreground">
                {s.modelo_aparelho} {s.armazenamento && `· ${s.armazenamento}`} {s.condicao_relatada && `· ${LABEL_CONDICAO[s.condicao_relatada] ?? s.condicao_relatada}`}
              </span>
            </div>
            {s.observacoes && <p className="text-xs text-muted-foreground">{s.observacoes}</p>}

            <div className="flex items-center justify-between">
              <a href={`https://wa.me/${s.telefone_contato}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                <MessageCircle className="h-3.5 w-3.5" />Conversar no WhatsApp
              </a>
              <span className="text-xs text-muted-foreground">{formatDateTime(s.created_at)}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
