import { OrcamentoForm } from "@/components/vendas/orcamento-form";
import { listarClientes } from "@/services/clientes/clientes.service";
import { listarProdutos, listarAparelhos } from "@/services/estoque/estoque.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface NovoOrcamentoPageProps {
  searchParams: Promise<{ clienteId?: string }>;
}

export default async function NovoOrcamentoPage({ searchParams }: NovoOrcamentoPageProps) {
  const { clienteId } = await searchParams;
  const [clientes, produtos, aparelhos] = await Promise.all([
    listarClientes(), listarProdutos(), listarAparelhos(),
  ]);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <h1 className="font-display text-xl font-semibold text-foreground">Novo orçamento</h1>
      <Card>
        <CardHeader><CardTitle>Dados do orçamento</CardTitle></CardHeader>
        <CardContent><OrcamentoForm clientes={clientes} produtos={produtos} aparelhos={aparelhos} clienteIdInicial={clienteId} /></CardContent>
      </Card>
    </div>
  );
}
