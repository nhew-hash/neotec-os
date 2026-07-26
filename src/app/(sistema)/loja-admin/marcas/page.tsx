import { listarMarcas } from "@/services/loja-admin/central-loja.service";
import { MarcasPanel } from "@/components/loja-admin/marcas-panel";
import { PageHeader } from "@/components/ui/page-header";

export default async function MarcasPage() {
  const marcas = await listarMarcas();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Marcas" description="Usadas pra organizar e filtrar o catálogo" />
      <MarcasPanel marcas={marcas} />
    </div>
  );
}
