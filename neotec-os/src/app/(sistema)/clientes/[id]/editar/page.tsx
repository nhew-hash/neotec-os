import { notFound } from "next/navigation";
import { buscarClientePorId } from "@/services/clientes/clientes.service";
import { ClienteForm } from "@/components/clientes/cliente-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function EditarClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cliente = await buscarClientePorId(id);
  if (!cliente) notFound();

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <h1 className="font-display text-xl font-semibold text-foreground">Editar cliente</h1>
      <Card>
        <CardHeader><CardTitle>Dados do cliente</CardTitle></CardHeader>
        <CardContent><ClienteForm cliente={cliente} /></CardContent>
      </Card>
    </div>
  );
}
