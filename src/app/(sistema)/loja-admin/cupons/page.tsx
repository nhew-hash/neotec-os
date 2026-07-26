import { listarCupons } from "@/services/loja-admin/central-loja.service";
import { CuponsPanel } from "@/components/loja-admin/cupons-panel";
import { PageHeader } from "@/components/ui/page-header";

export default async function CuponsPage() {
  const cupons = await listarCupons();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Cupons" description="Códigos de desconto — validados de verdade no checkout" />
      <CuponsPanel cupons={cupons} />
    </div>
  );
}
