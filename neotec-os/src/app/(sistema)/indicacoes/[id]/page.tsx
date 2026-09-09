import { notFound } from "next/navigation";
import { buscarIndicadorPorId } from "@/services/indicacoes/indicacoes.service";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { NovoMovimentoIndicadorForm } from "@/components/indicacoes/novo-movimento-indicador-form";
import { formatCurrency, formatDateTime, formatWhatsapp } from "@/utils";

export default async function IndicadorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resultado = await buscarIndicadorPorId(id);
  if (!resultado) notFound();

  const { indicador, movimentos, saldo } = resultado;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={indicador.nome}
        description={indicador.telefone ? formatWhatsapp(indicador.telefone) : undefined}
      />

      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <span className="text-sm text-muted-foreground">Saldo atual</span>
          <span className={`neotec-dado font-display text-2xl font-semibold ${saldo > 0 ? "text-success" : saldo < 0 ? "text-danger" : "text-foreground"}`}>
            {formatCurrency(saldo)}
          </span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Registrar movimento</CardTitle></CardHeader>
        <CardContent><NovoMovimentoIndicadorForm indicadorId={indicador.id} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Histórico</CardTitle></CardHeader>
        <CardContent className="p-0">
          {movimentos.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum movimento registrado ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimentos.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{formatDateTime(m.data)}</TableCell>
                    <TableCell>{m.tipo === "credito" ? "Crédito" : "Retirada"}</TableCell>
                    <TableCell>{m.motivo ?? "—"}</TableCell>
                    <TableCell className={m.tipo === "credito" ? "text-success" : "text-danger"}>
                      {m.tipo === "credito" ? "+" : "-"}{formatCurrency(m.valor)}
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
