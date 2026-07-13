import Link from "next/link";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/utils";
import { podeVerCusto } from "@/utils/permissions";
import type { Venda, Cliente, CargoUsuario } from "@/types";

interface VendasTableProps {
  vendas: (Venda & { cliente: Pick<Cliente, "id" | "nome"> | null })[];
  cargo: CargoUsuario;
}

export function VendasTable({ vendas, cargo }: VendasTableProps) {
  const podeVerLucro = podeVerCusto(cargo);

  if (vendas.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
        Nenhuma venda registrada ainda.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Cliente</TableHead>
          <TableHead>Valor</TableHead>
          {podeVerLucro && <TableHead>Lucro</TableHead>}
          <TableHead>Status</TableHead>
          <TableHead>Data</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {vendas.map((venda) => (
          <TableRow key={venda.id}>
            <TableCell>
              {venda.cliente ? (
                <Link href={`/vendas/${venda.id}`} className="font-medium text-foreground hover:underline">
                  {venda.cliente.nome}
                </Link>
              ) : (
                <Link href={`/vendas/${venda.id}`} className="font-medium text-muted-foreground hover:underline">
                  Venda avulsa
                </Link>
              )}
            </TableCell>
            <TableCell>{formatCurrency(venda.valor_total)}</TableCell>
            {podeVerLucro && <TableCell className="text-muted-foreground">{venda.lucro != null ? formatCurrency(venda.lucro) : "—"}</TableCell>}
            <TableCell><Badge variant={venda.status === "concluida" ? "success" : "secondary"}>{venda.status}</Badge></TableCell>
            <TableCell className="text-xs text-muted-foreground">{formatDate(venda.data_venda)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
