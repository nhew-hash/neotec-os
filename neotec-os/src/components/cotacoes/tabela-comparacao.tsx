import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatCurrency } from "@/utils";
import { cn } from "@/lib/utils";
import type { compararCotacoes } from "@/services/cotacoes/cotacoes-comparacao.service";

type ResultadoComparacao = Awaited<ReturnType<typeof compararCotacoes>>;

const SITUACAO_CONFIG = {
  subiu: { icon: ArrowUp, cor: "text-danger", label: "Subiu" },
  caiu: { icon: ArrowDown, cor: "text-success", label: "Caiu" },
  igual: { icon: Minus, cor: "text-muted-foreground", label: "Igual" },
  so_em_a: { icon: Minus, cor: "text-muted-foreground", label: "Só na A" },
  so_em_b: { icon: Minus, cor: "text-muted-foreground", label: "Só na B" },
} as const;

export function TabelaComparacao({ resultado }: { resultado: ResultadoComparacao }) {
  const { cotacaoA, cotacaoB, comparacao } = resultado;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{cotacaoA.fornecedor} → {cotacaoB.fornecedor}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aparelho</TableHead>
              <TableHead>Preço A</TableHead>
              <TableHead>Preço B</TableHead>
              <TableHead>Diferença</TableHead>
              <TableHead>Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comparacao.map((item, i) => {
              const config = SITUACAO_CONFIG[item.situacao];
              const Icon = config.icon;
              return (
                <TableRow key={i}>
                  <TableCell className="font-medium text-foreground">
                    {item.modelo} {item.armazenamento && `· ${item.armazenamento}`} {item.cor && `· ${item.cor}`}
                  </TableCell>
                  <TableCell>{item.precoA != null ? formatCurrency(item.precoA) : "—"}</TableCell>
                  <TableCell>{item.precoB != null ? formatCurrency(item.precoB) : "—"}</TableCell>
                  <TableCell className={cn(config.cor)}>
                    {item.diferenca != null
                      ? `${item.diferenca > 0 ? "+" : ""}${formatCurrency(item.diferenca)} (${item.percentual?.toFixed(1)}%)`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <span className={cn("flex items-center gap-1 text-xs font-medium", config.cor)}>
                      <Icon className="h-3.5 w-3.5" />
                      {config.label}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
