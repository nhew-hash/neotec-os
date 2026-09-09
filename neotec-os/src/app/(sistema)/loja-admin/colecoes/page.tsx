import { listarColecoes } from "@/services/loja-admin/central-loja.service";
import { ColecoesPanel } from "@/components/loja-admin/colecoes-panel";
import { PageHeader } from "@/components/ui/page-header";

export default async function ColecoesPage() {
  const colecoes = await listarColecoes();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Coleções" description="Agrupamentos de produtos pra destacar na loja (ex: campanhas sazonais)" />
      <ColecoesPanel colecoes={colecoes} />
    </div>
  );
}
