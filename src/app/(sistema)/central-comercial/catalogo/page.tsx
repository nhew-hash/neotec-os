import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { exigirCargo } from "@/lib/auth/exigir-cargo";
import { CatalogoVenda } from "@/components/central-comercial/catalogo-venda";
import { listarCatalogoVenda } from "@/services/central-comercial/catalogo.service";
import { tentar } from "@/services/central-comercial/central-comercial.service";

export const metadata = { title: "Catálogo de venda" };
export const dynamic = "force-dynamic";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function CatalogoVendaPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const auth = await exigirCargo(["admin", "gerente", "vendedor"]);
  if (!auth.permitido) redirect("/dashboard");
  const sp = await searchParams;
  const cliente = typeof sp.cliente === "string" && uuid.test(sp.cliente) ? sp.cliente : null;
  const catalogo = await tentar(() => listarCatalogoVenda());

  return (
    <div className="space-y-5">
      <PageHeader title="Catálogo de venda" description="Tudo o que tem para vender agora, com foto, bateria e preço. Selecione para mandar ao cliente ou montar a proposta." />
      {!catalogo.ok ? (
        <Card className="p-4 text-sm text-danger" role="alert">O catálogo não pôde ser carregado agora ({catalogo.motivo}).</Card>
      ) : (
        <CatalogoVenda itens={catalogo.dados} clienteId={cliente} />
      )}
    </div>
  );
}
