import Link from "next/link";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatWhatsapp } from "@/utils";
import type { Cliente } from "@/types";

const NIVEL_LABEL: Record<Cliente["nivel"], { label: string; variant: "default" | "warning" }> = {
  normal: { label: "Normal", variant: "default" },
  vip: { label: "VIP", variant: "warning" },
};

export function ClientesTable({ clientes }: { clientes: Cliente[] }) {
  if (clientes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-border py-16 text-center">
        <p className="font-display text-sm font-medium text-foreground">Nenhum cliente cadastrado ainda</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          Cadastre o primeiro cliente para começar a usar o CRM da Neotec.
        </p>
        <Link href="/clientes/novo" className="mt-2 text-sm font-medium text-primary hover:underline">
          Cadastrar cliente
        </Link>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>WhatsApp</TableHead>
          <TableHead>Nível</TableHead>
          <TableHead>Cadastrado em</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clientes.map((cliente) => (
          <TableRow key={cliente.id}>
            <TableCell className="font-medium text-foreground">{cliente.nome}</TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">
              {formatWhatsapp(cliente.whatsapp)}
            </TableCell>
            <TableCell>
              <Badge variant={NIVEL_LABEL[cliente.nivel].variant}>
                {NIVEL_LABEL[cliente.nivel].label}
              </Badge>
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {formatDate(cliente.data_cadastro)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
