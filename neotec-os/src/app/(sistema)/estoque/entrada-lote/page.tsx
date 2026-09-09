import { EntradaLoteForm } from "@/components/estoque/entrada-lote-form";
import { listarProdutos } from "@/services/estoque/estoque.service";

export default async function EntradaLotePage() {
  const produtos = await listarProdutos();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Entrada em lote</h1>
        <p className="text-sm text-muted-foreground">
          Lance vários produtos de uma vez ao receber mercadoria, sem abrir cadastro por item.
        </p>
      </div>
      <EntradaLoteForm produtos={produtos} />
    </div>
  );
}
