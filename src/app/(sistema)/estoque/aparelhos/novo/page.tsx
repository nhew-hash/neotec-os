import { AparelhoForm } from "@/components/estoque/aparelho-form";
import { listarProdutos } from "@/services/estoque/estoque.service";
import { listarInvestidores } from "@/services/investidores/investidores.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NovoAparelhoPage() {
  const [produtos, investidores] = await Promise.all([listarProdutos(), listarInvestidores()]);
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <h1 className="font-display text-xl font-semibold text-foreground">Novo aparelho</h1>
      <Card>
        <CardHeader><CardTitle>Dados do aparelho</CardTitle></CardHeader>
        <CardContent><AparelhoForm produtos={produtos} investidores={investidores} /></CardContent>
      </Card>
    </div>
  );
}
