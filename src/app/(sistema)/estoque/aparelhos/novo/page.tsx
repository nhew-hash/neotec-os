import { AparelhoForm } from "@/components/estoque/aparelho-form";
import { listarProdutos } from "@/services/estoque/estoque.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NovoAparelhoPage() {
  const produtos = await listarProdutos();
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <h1 className="font-display text-xl font-semibold text-foreground">Novo aparelho</h1>
      <Card>
        <CardHeader><CardTitle>Dados do aparelho</CardTitle></CardHeader>
        <CardContent><AparelhoForm produtos={produtos} /></CardContent>
      </Card>
    </div>
  );
}
