import { notFound } from "next/navigation";
import { buscarCotacaoPorId } from "@/services/cotacoes/cotacoes.service";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateTime } from "@/utils";

export default async function CotacaoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cotacao = await buscarCotacaoPorId(id);
  if (!cotacao) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={cotacao.fornecedor}
        description={`${cotacao.categoria} · ${formatDateTime(cotacao.data_cotacao)} · ${cotacao.itens.length} item(ns)`}
      />

      {cotacao.observacao && (
        <Card><CardContent className="p-4 text-sm text-muted-foreground">{cotacao.observacao}</CardContent></Card>
      )}

      <Card>
        <CardHeader><CardTitle>Aparelhos</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Modelo</TableHead>
                <TableHead>Armazenamento</TableHead>
                <TableHead>Cor</TableHead>
                <TableHead>Bateria</TableHead>
                <TableHead>Garantia</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Qtd</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cotacao.itens.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium text-foreground">{item.modelo}</TableCell>
                  <TableCell>{item.armazenamento ?? "—"}</TableCell>
                  <TableCell>{item.cor ?? "—"}</TableCell>
                  <TableCell>{item.bateria_percentual != null ? `${item.bateria_percentual}%` : "—"}</TableCell>
                  <TableCell>{item.garantia ? <Badge variant="secondary">{item.garantia}</Badge> : "—"}</TableCell>
                  <TableCell className="font-medium text-foreground">{formatCurrency(item.preco)}</TableCell>
                  <TableCell>{item.quantidade}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Texto original</CardTitle></CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap font-mono text-xs text-muted-foreground">{cotacao.texto_original}</pre>
        </CardContent>
      </Card>
    </div>
  );
}
