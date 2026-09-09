"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { atualizarStatusPedidoLojaAction } from "@/services/loja/pedidos-loja.actions";
import { formatCurrency, formatDateTime, formatWhatsapp } from "@/utils";
import type { PedidoLojaComItens } from "@/services/loja/pedidos-loja.service";
import type { StatusPedidoLoja } from "@/types";

const STATUS_LABEL: Record<StatusPedidoLoja, string> = {
  novo: "Novo", em_atendimento: "Em atendimento", concluido: "Concluído", cancelado: "Cancelado",
};
const STATUS_TONE: Record<StatusPedidoLoja, "danger" | "warning" | "success" | "secondary"> = {
  novo: "danger", em_atendimento: "warning", concluido: "success", cancelado: "secondary",
};

export function PedidosLojaPanel({ pedidos }: { pedidos: PedidoLojaComItens[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleStatus(id: string, status: StatusPedidoLoja) {
    startTransition(async () => {
      await atualizarStatusPedidoLojaAction(id, status);
      router.refresh();
    });
  }

  if (pedidos.length === 0) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Nenhum pedido da loja ainda.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {pedidos.map((pedido) => (
        <Card key={pedido.id}>
          <CardContent className="flex flex-col gap-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-foreground">{pedido.nome_contato}</p>
                <p className="neotec-id-tag mt-0.5 w-fit">{formatWhatsapp(pedido.telefone_contato)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={pedido.origem_fechamento === "whatsapp" ? "secondary" : "default"}>
                  {pedido.origem_fechamento === "whatsapp" ? "Via WhatsApp" : "Pagamento online"}
                </Badge>
                <Select value={pedido.status} onValueChange={(v) => handleStatus(pedido.id, v as StatusPedidoLoja)} disabled={isPending}>
                  <SelectTrigger className="h-8 w-40 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STATUS_LABEL) as StatusPedidoLoja[]).map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-1 rounded-md bg-secondary p-2.5 text-xs">
              {pedido.itens.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <span>{item.quantidade}x {item.nome_exibido}</span>
                  <span className="neotec-dado">{formatCurrency(item.valor * item.quantidade)}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-sm">
              <a
                href={`https://wa.me/${pedido.telefone_contato}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <MessageCircle className="h-3.5 w-3.5" />Conversar no WhatsApp
              </a>
              <span className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{formatDateTime(pedido.created_at)}</span>
                <span className="neotec-dado font-semibold text-foreground">{formatCurrency(pedido.valor_total)}</span>
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
