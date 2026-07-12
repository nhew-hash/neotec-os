import { listarRetornosPendentes } from "@/services/crm/crm.service";
import { listarClientes } from "@/services/clientes/clientes.service";
import { RetornosList } from "@/components/crm/retornos-list";
import { NovoRetornoForm } from "@/components/crm/novo-retorno-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function RetornosPage() {
  const [retornos, clientes] = await Promise.all([listarRetornosPendentes(), listarClientes()]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Agenda de retornos</h1>
        <p className="text-sm text-muted-foreground">{retornos.length} retorno(s) pendente(s)</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <RetornosList retornos={retornos} />

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Novo retorno</CardTitle>
          </CardHeader>
          <CardContent>
            <NovoRetornoForm clientes={clientes} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
