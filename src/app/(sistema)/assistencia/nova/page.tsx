import { OrdemServicoForm } from "@/components/assistencia/os-form";
import { listarClientes } from "@/services/clientes/clientes.service";
import { listarAparelhos } from "@/services/estoque/estoque.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NovaOSPage() {
  const [clientes, aparelhos] = await Promise.all([listarClientes(), listarAparelhos()]);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <h1 className="font-display text-xl font-semibold text-foreground">Nova ordem de serviço</h1>
      <Card>
        <CardHeader><CardTitle>Dados da OS</CardTitle></CardHeader>
        <CardContent><OrdemServicoForm clientes={clientes} aparelhos={aparelhos} /></CardContent>
      </Card>
    </div>
  );
}
