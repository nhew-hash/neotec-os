import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { exigirCargo } from "@/lib/auth/exigir-cargo";
import { AtendimentoGuiado } from "@/components/central-comercial/atendimento-guiado";
import { listarCatalogoVenda } from "@/services/central-comercial/catalogo.service";
import { obterClienteBasico } from "@/services/central-comercial/clientes-busca.service";
import { tentar } from "@/services/central-comercial/central-comercial.service";

export const metadata = { title: "Atender cliente" };
export const dynamic = "force-dynamic";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AtendimentoPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const auth = await exigirCargo(["admin", "gerente", "vendedor"]);
  if (!auth.permitido) redirect("/dashboard");
  const sp = await searchParams;
  const clienteId = typeof sp.cliente === "string" && uuid.test(sp.cliente) ? sp.cliente : null;
  const [catalogo, cliente] = await Promise.all([
    tentar(() => listarCatalogoVenda()),
    clienteId ? tentar(() => obterClienteBasico(clienteId)) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title="Atender cliente" description="Primeiro eu entendo. Depois eu indico. Em seguida eu negocio. E, por fim, eu conduzo ao fechamento." />
      {!catalogo.ok ? (
        <Card className="p-4 text-sm text-danger" role="alert">O estoque não pôde ser carregado agora ({catalogo.motivo}). Dá para atender pela <a className="underline" href="/central-comercial/proposta">proposta</a> direto.</Card>
      ) : (
        <AtendimentoGuiado itens={catalogo.dados} clienteInicial={cliente?.ok ? cliente.dados : null} />
      )}
    </div>
  );
}
