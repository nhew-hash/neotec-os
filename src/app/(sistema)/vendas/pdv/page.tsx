import { PdvCart } from "@/components/vendas/pdv-cart";
import { listarClientes } from "@/services/clientes/clientes.service";
import { listarProdutos, listarAparelhos } from "@/services/estoque/estoque.service";

export default async function PdvPage() {
  const [clientes, produtos, aparelhos] = await Promise.all([
    listarClientes(), listarProdutos(), listarAparelhos(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Nova venda</h1>
        <p className="text-sm text-muted-foreground">PDV rápido — sem precisar passar por orçamento</p>
      </div>
      <PdvCart clientes={clientes} produtos={produtos} aparelhos={aparelhos} />
    </div>
  );
}
