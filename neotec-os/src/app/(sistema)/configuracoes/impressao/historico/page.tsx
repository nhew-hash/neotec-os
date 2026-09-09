import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { listarHistoricoImpressoes } from "@/services/impressao/historico.service";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/utils";

const LABEL_TIPO: Record<string, string> = {
  os: "Ordem de Serviço", orcamento: "Orçamento", venda: "Venda", recibo: "Recibo",
  etiqueta: "Etiqueta", garantia: "Garantia", termo_entrega: "Termo de entrega", termo_entrada: "Termo de entrada",
};

const ROTA_TIPO: Record<string, string> = {
  os: "/impressao/os", orcamento: "/impressao/orcamento", venda: "/impressao/venda", recibo: "/impressao/recibo",
};

export default async function HistoricoImpressaoPage() {
  const historico = await listarHistoricoImpressoes();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Histórico de impressões" description="Últimas 100 impressões — quem, quando, o quê" />
      <Card>
        <CardContent className="p-0">
          {historico.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Nenhuma impressão registrada ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Documento</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {historico.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-medium text-foreground">{LABEL_TIPO[h.tipo_documento] ?? h.tipo_documento}</TableCell>
                    <TableCell>{h.usuario?.nome ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDateTime(h.criado_em)}</TableCell>
                    <TableCell>
                      {ROTA_TIPO[h.tipo_documento] && (
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`${ROTA_TIPO[h.tipo_documento]}/${h.referencia_id}`} target="_blank">
                            <RotateCcw className="h-3.5 w-3.5" />Reimprimir
                          </Link>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
