import { ImportarPastaImagensPanel } from "@/components/banco-imagens/importar-pasta-imagens-panel";
import { PageHeader } from "@/components/ui/page-header";

export default function BancoImagensPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Banco Central de Imagens"
        description="Importa uma pasta inteira — a IA identifica e vincula automaticamente aos produtos correspondentes"
      />
      <ImportarPastaImagensPanel />
    </div>
  );
}
