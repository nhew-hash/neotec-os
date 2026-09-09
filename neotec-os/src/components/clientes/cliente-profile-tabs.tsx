import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, formatDateTime } from "@/utils";
import type { ReactNode } from "react";
import type { Venda, OrdemServico, Cashback, Garantia, TimelineEvento, Orcamento, Conversa, Foto } from "@/types";

interface ClienteProfileTabsProps {
  timeline: TimelineEvento[];
  vendas: Venda[];
  ordensServico: OrdemServico[];
  cashback: Cashback[];
  saldoCashback: number;
  garantias: Garantia[];
  orcamentos: Orcamento[];
  conversas: Conversa[];
  fotos: Foto[];
}

const TIPO_EVENTO_LABEL: Record<TimelineEvento["tipo_evento"], string> = {
  venda: "Venda",
  orcamento: "Orçamento",
  ordem_servico: "Ordem de serviço",
  cashback: "Cashback",
  garantia: "Garantia",
  retorno: "Retorno",
  cliente_criado: "Cadastro",
};

export function ClienteProfileTabs({
  timeline, vendas, ordensServico, cashback, saldoCashback, garantias, orcamentos, conversas, fotos,
}: ClienteProfileTabsProps) {
  return (
    <Tabs defaultValue="timeline">
      <TabsList className="h-auto flex-wrap">
        <TabsTrigger value="timeline">Timeline</TabsTrigger>
        <TabsTrigger value="ordens">Ordens ({ordensServico.length})</TabsTrigger>
        <TabsTrigger value="compras">Compras ({vendas.length})</TabsTrigger>
        <TabsTrigger value="orcamentos">Orçamentos ({orcamentos.length})</TabsTrigger>
        <TabsTrigger value="garantias">Garantias ({garantias.length})</TabsTrigger>
        <TabsTrigger value="cashback">Cashback ({formatCurrency(saldoCashback)})</TabsTrigger>
        <TabsTrigger value="conversas">Conversas ({conversas.length})</TabsTrigger>
        <TabsTrigger value="fotos">Fotos ({fotos.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="timeline">
        {timeline.length === 0 ? <EmptyState texto="Nenhum evento registrado ainda." /> : (
          <div className="flex flex-col gap-2">
            {timeline.map((evento) => (
              <RowItem key={evento.id} titulo={evento.titulo} subtitulo={formatDateTime(evento.data)}>
                <Badge variant="secondary">{TIPO_EVENTO_LABEL[evento.tipo_evento]}</Badge>
              </RowItem>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="ordens">
        {ordensServico.length === 0 ? <EmptyState texto="Nenhum reparo registrado ainda." /> : (
          <div className="flex flex-col gap-2">
            {ordensServico.map((os) => (
              <RowItem key={os.id} titulo={os.defeito} subtitulo={formatDate(os.data_entrada)}>
                <Badge>{os.status}</Badge>
              </RowItem>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="compras">
        {vendas.length === 0 ? <EmptyState texto="Nenhuma compra registrada ainda." /> : (
          <div className="flex flex-col gap-2">
            {vendas.map((v) => (
              <RowItem key={v.id} titulo={formatCurrency(v.valor_total)} subtitulo={formatDateTime(v.data_venda)}>
                <Badge variant={v.status === "concluida" ? "success" : "secondary"}>{v.status}</Badge>
              </RowItem>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="orcamentos">
        {orcamentos.length === 0 ? <EmptyState texto="Nenhum orçamento criado ainda." /> : (
          <div className="flex flex-col gap-2">
            {orcamentos.map((o) => (
              <RowItem key={o.id} titulo={formatCurrency(o.valor)} subtitulo={formatDate(o.data_criacao)}>
                <Badge variant="secondary">{o.status}</Badge>
              </RowItem>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="garantias">
        {garantias.length === 0 ? <EmptyState texto="Nenhuma garantia ativa." /> : (
          <div className="flex flex-col gap-2">
            {garantias.map((g) => (
              <RowItem key={g.id} titulo={g.tipo === "produto" ? "Garantia de produto" : "Garantia de serviço"} subtitulo={`Até ${formatDate(g.fim)}`}>
                <Badge variant={new Date(g.fim) > new Date() ? "success" : "secondary"}>
                  {new Date(g.fim) > new Date() ? "Ativa" : "Expirada"}
                </Badge>
              </RowItem>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="cashback">
        {cashback.length === 0 ? <EmptyState texto="Nenhuma movimentação de cashback ainda." /> : (
          <div className="flex flex-col gap-2">
            {cashback.map((c) => (
              <RowItem key={c.id} titulo={c.origem ?? "Movimentação"} subtitulo={formatDateTime(c.data)}>
                <span className={c.tipo === "credito" ? "text-success" : "text-danger"}>
                  {c.tipo === "credito" ? "+" : "-"}{formatCurrency(c.valor)}
                </span>
              </RowItem>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="conversas">
        {conversas.length === 0 ? <EmptyState texto="Nenhuma conversa registrada ainda." /> : (
          <div className="flex flex-col gap-2">
            {conversas.map((c) => (
              <RowItem key={c.id} titulo={c.produto_interesse ?? "Conversa"} subtitulo={formatDateTime(c.data_inicio)}>
                <Badge variant="secondary">{c.temperatura}</Badge>
              </RowItem>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="fotos">
        {fotos.length === 0 ? <EmptyState texto="Nenhuma foto anexada ainda." /> : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {fotos.map((f) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={f.id} src={f.url} alt="" className="aspect-square w-full rounded-md border border-border object-cover" />
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

function RowItem({ titulo, subtitulo, children }: { titulo: string; subtitulo: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
      <div className="flex flex-col">
        <span className="font-medium text-foreground">{titulo}</span>
        <span className="text-xs text-muted-foreground">{subtitulo}</span>
      </div>
      {children}
    </div>
  );
}

function EmptyState({ texto }: { texto: string }) {
  return (
    <div className="rounded-card border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
      {texto}
    </div>
  );
}
