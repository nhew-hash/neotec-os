import { notFound } from "next/navigation";
import { buscarVendaPorId } from "@/services/vendas/vendas.service";
import { ChecklistEntrega } from "@/components/vendas/checklist-entrega";
import { BotaoImprimir } from "@/components/impressao/botao-imprimir";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateTime } from "@/utils";

export default async function VendaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const venda = await buscarVendaPorId(id);
  if (!venda) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">
            {venda.cliente?.nome ? `Venda para ${venda.cliente.nome}` : "Venda avulsa (balcão)"}
          </h1>
          <p className="text-sm text-muted-foreground">{formatDateTime(venda.data_venda)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={venda.status === "concluida" ? "success" : "secondary"}>{venda.status}</Badge>
          <BotaoImprimir tipo="venda" id={id} label="Cupom" />
          <BotaoImprimir tipo="recibo" id={id} label="Recibo" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader><CardTitle>Checklist de entrega</CardTitle></CardHeader>
          <CardContent>
            <ChecklistEntrega
              vendaId={venda.id}
              inicial={{
                checklist_aparelho_conferido: venda.checklist_aparelho_conferido,
                checklist_acessorios_recebidos: venda.checklist_acessorios_recebidos,
                checklist_garantia_entregue: venda.checklist_garantia_entregue,
                checklist_cliente_confirmou: venda.checklist_cliente_confirmou,
              }}
            />
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader><CardTitle>Resumo</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between border-b border-border py-1.5">
              <span className="text-muted-foreground">Valor total</span>
              <span className="font-medium text-foreground">{formatCurrency(venda.valor_total)}</span>
            </div>
            {venda.lucro != null && (
              <div className="flex justify-between border-b border-border py-1.5">
                <span className="text-muted-foreground">Lucro</span>
                <span className="font-medium text-foreground">{formatCurrency(venda.lucro)}</span>
              </div>
            )}
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">Pagamento</span>
              <span className="font-medium text-foreground">{venda.forma_pagamento}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
