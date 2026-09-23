import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { obterAvaliacao } from "@/services/trade-in/aplicacao.service";
import { AvaliacaoDetalhe } from "@/components/trade-in/avaliacao-detalhe";

export default async function AvaliacaoTradeInPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const avaliacao = await obterAvaliacao(id);
  if (!avaliacao) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Avaliação de troca" description={avaliacao.modelo_nome} />
      <AvaliacaoDetalhe avaliacao={avaliacao} />
    </div>
  );
}
