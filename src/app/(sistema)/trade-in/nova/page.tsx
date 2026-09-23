import { PageHeader } from "@/components/ui/page-header";
import { listarModelosTradeIn } from "@/services/trade-in/aplicacao.service";
import { NovaAvaliacaoForm } from "@/components/trade-in/nova-avaliacao-form";

export default async function NovaAvaliacaoTradeInPage() {
  const modelos = await listarModelosTradeIn({ somenteAtivos: true });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Nova avaliação de troca" description="Preencha o checklist real do aparelho — o valor é calculado pelo mesmo motor do site e do bot." />
      <NovaAvaliacaoForm modelos={modelos} />
    </div>
  );
}
