import { PageHeader } from "@/components/ui/page-header";
import { categoriasExistentes, obterContextoAdmin } from "@/services/achadinhos/achadinhos.admin.service";
import { ProdutoForm } from "@/components/achadinhos-admin/produto-form";

export const metadata = { title: "Novo achadinho" };

export default async function NovoProdutoPage() {
  const ctx = (await obterContextoAdmin())!;
  return (
    <div className="space-y-6">
      <PageHeader title="Novo achadinho" description="Nome e link bastam para começar. O resto você completa quando quiser." />
      <ProdutoForm produtoId={null} categorias={await categoriasExistentes(ctx)} />
    </div>
  );
}
