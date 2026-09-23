import { PageHeader } from "@/components/ui/page-header";
import { listarModelosTradeIn, listarAvariasCatalogo, obterConfigTradeIn } from "@/services/trade-in/aplicacao.service";
import { ModelosTradeInPanel } from "@/components/trade-in/modelos-panel";

export default async function ModelosTradeInPage() {
  const [modelos, avarias, config] = await Promise.all([
    listarModelosTradeIn(),
    listarAvariasCatalogo(),
    obterConfigTradeIn(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tabela de valores de troca"
        description="Valor de troca é independente do preço de venda — edite aqui sem afetar o catálogo da loja. Avaliações já feitas continuam mostrando o valor da época (snapshot)."
      />
      <ModelosTradeInPanel modelos={modelos} avarias={avarias} config={config} />
    </div>
  );
}
