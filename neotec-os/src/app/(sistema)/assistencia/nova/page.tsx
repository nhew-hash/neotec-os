import { OrdemServicoForm } from "@/components/assistencia/os-form";
import { listarClientes } from "@/services/clientes/clientes.service";
import { listarAparelhos } from "@/services/estoque/estoque.service";
import { listarIndicadoresAtivos } from "@/services/indicacoes/indicacoes.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface NovaOSPageProps {
  searchParams: Promise<{ clienteId?: string }>;
}

export default async function NovaOSPage({ searchParams }: NovaOSPageProps) {
  const { clienteId } = await searchParams;
  const [clientes, aparelhos, indicadores] = await Promise.all([
    listarClientes(), listarAparelhos(), listarIndicadoresAtivos(),
  ]);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <h1 className="font-display text-xl font-semibold text-foreground">Nova ordem de serviço</h1>
      <Card>
        <CardHeader><CardTitle>Dados da OS</CardTitle></CardHeader>
        <CardContent><OrdemServicoForm clientes={clientes} aparelhos={aparelhos} clienteIdInicial={clienteId} indicadores={indicadores} /></CardContent>
      </Card>
    </div>
  );
}
