import { listarInvestidoresComResumo } from "@/services/investidores/investidores.service";
import { InvestidoresTable, NovoInvestidorForm } from "@/components/investidores/investidor-components";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function InvestidoresPage() {
  const investidores = await listarInvestidoresComResumo();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Investidores</h1>
        <p className="text-sm text-muted-foreground">Onde cada real está aplicado, em tempo real</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <Card><CardContent className="p-0"><InvestidoresTable investidores={investidores} /></CardContent></Card>
        <Card className="h-fit">
          <CardHeader><CardTitle>Novo investidor</CardTitle></CardHeader>
          <CardContent><NovoInvestidorForm /></CardContent>
        </Card>
      </div>
    </div>
  );
}
