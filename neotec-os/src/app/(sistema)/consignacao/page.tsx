import { listarConsignacoes } from "@/services/consignacao/consignacao.service";
import { listarClientes } from "@/services/clientes/clientes.service";
import { listarAparelhos } from "@/services/estoque/estoque.service";
import { ConsignacoesTable, NovaConsignacaoForm } from "@/components/consignacao/consignacao-components";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ConsignacaoPage() {
  const [consignacoes, clientes, aparelhos] = await Promise.all([
    listarConsignacoes(), listarClientes(), listarAparelhos(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Consignação</h1>
        <p className="text-sm text-muted-foreground">{consignacoes.length} consignação(ões) registrada(s)</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <Card><CardContent className="p-0"><ConsignacoesTable consignacoes={consignacoes} /></CardContent></Card>
        <Card className="h-fit">
          <CardHeader><CardTitle>Nova consignação</CardTitle></CardHeader>
          <CardContent><NovaConsignacaoForm clientes={clientes} aparelhos={aparelhos} /></CardContent>
        </Card>
      </div>
    </div>
  );
}
