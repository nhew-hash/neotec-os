import { listarRegrasFrete } from "@/services/loja-admin/central-loja.service";
import { FretesPanel } from "@/components/loja-admin/fretes-panel";
import { PageHeader } from "@/components/ui/page-header";

export default async function FretesPage() {
  const regras = await listarRegrasFrete();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Fretes" description="Valor e prazo de entrega por região" />
      <FretesPanel regras={regras} />
    </div>
  );
}
