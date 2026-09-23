import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Plus, Settings } from "lucide-react";
import { listarAvaliacoes } from "@/services/trade-in/aplicacao.service";
import { AvaliacoesLista } from "@/components/trade-in/avaliacoes-lista";

export default async function TradeInPage() {
  const avaliacoes = await listarAvaliacoes();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Trade-in / Avaliação de aparelhos"
        description="Checklist real, cálculo pelo mesmo motor usado no site e no bot, e aprovação antes de virar abatimento numa venda ou item de estoque."
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/trade-in/modelos"><Settings className="h-4 w-4" />Tabela de valores</Link>
            </Button>
            <Button asChild>
              <Link href="/trade-in/nova"><Plus className="h-4 w-4" />Nova avaliação</Link>
            </Button>
          </div>
        }
      />
      <AvaliacoesLista avaliacoes={avaliacoes} />
    </div>
  );
}
