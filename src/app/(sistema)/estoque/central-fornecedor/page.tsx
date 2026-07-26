import { CentralFornecedorPanel } from "@/components/seminovos/central-fornecedor-panel";
import { PageHeader } from "@/components/ui/page-header";

export default function CentralFornecedorPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Central de Cadastro por Fornecedor"
        description="Cola a lista inteira do fornecedor — a IA separa seminovo, lacrado e qualquer outro produto, e manda cada um pro lugar certo"
      />
      <CentralFornecedorPanel />
    </div>
  );
}
