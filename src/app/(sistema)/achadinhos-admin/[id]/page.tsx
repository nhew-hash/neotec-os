import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { buscarProdutoAdmin, categoriasExistentes, obterContextoAdmin } from "@/services/achadinhos/achadinhos.admin.service";
import { ProdutoForm } from "@/components/achadinhos-admin/produto-form";
import { produtoParaFormulario } from "@/lib/achadinhos/formulario";
import { STATUS_INFO } from "@/lib/achadinhos/status";

export const metadata = { title: "Editar achadinho" };

export default async function EditarProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = (await obterContextoAdmin())!;
  const p = await buscarProdutoAdmin(ctx, id);
  if (!p) notFound();
  const info = STATUS_INFO[p.status];
  return (
    <div className="space-y-6">
      <PageHeader
        title={p.nome}
        description={`${p.cliques.toLocaleString("pt-BR")} cliques para o Mercado Livre · /achadinhos/${p.slug}`}
        actions={<StatusBadge label={info.label} tone={info.tone} />}
      />
      <ProdutoForm produtoId={p.id} slug={p.status === "ativo" ? p.slug : undefined} inicial={produtoParaFormulario(p)} categorias={await categoriasExistentes(ctx)} />
    </div>
  );
}
