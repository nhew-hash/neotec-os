import { ProdutoForm } from "@/components/estoque/produto-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NovoProdutoPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <h1 className="font-display text-xl font-semibold text-foreground">Novo produto</h1>
      <Card>
        <CardHeader><CardTitle>Dados do produto</CardTitle></CardHeader>
        <CardContent><ProdutoForm /></CardContent>
      </Card>
    </div>
  );
}
