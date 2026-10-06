import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { listarChaves, obterContextoAdmin } from "@/services/achadinhos/achadinhos.admin.service";
import { urlSite } from "@/lib/achadinhos/apresentacao";
import { ChavesPainel } from "@/components/achadinhos-admin/chaves-painel";

export const metadata = { title: "Conexão com o Claude" };

export default async function ChavesPage() {
  const ctx = (await obterContextoAdmin())!;
  if (ctx.cargo !== "admin") redirect("/achadinhos-admin");
  return (
    <div className="space-y-6">
      <PageHeader title="Conexão com o Claude" description="Chaves que permitem ao Claude cadastrar e organizar o catálogo. Ele sempre cria rascunhos; você decide o que vai ao ar." />
      <ChavesPainel chaves={await listarChaves()} site={urlSite()} />
    </div>
  );
}
