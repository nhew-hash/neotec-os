import Link from "next/link";
import { Plus } from "lucide-react";
import { listarClientes } from "@/services/clientes/clientes.service";
import { ClientesTable } from "@/components/clientes/clientes-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function ClientesPage() {
  const clientes = await listarClientes();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground">{clientes.length} cliente(s) cadastrado(s)</p>
        </div>
        <Button asChild>
          <Link href="/clientes/novo">
            <Plus className="h-4 w-4" />
            Novo cliente
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <ClientesTable clientes={clientes} />
        </CardContent>
      </Card>
    </div>
  );
}
