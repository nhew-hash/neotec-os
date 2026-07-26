import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buscarConfigPrecificacao, listarTaxasParcelamento } from "@/services/precificacao/config-precificacao.service";
import { PrecificacaoPanel } from "@/components/precificacao/precificacao-panel";
import { PageHeader } from "@/components/ui/page-header";
import type { CargoUsuario } from "@/types";

export default async function ParcelamentoConfigPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: perfil } = await supabase
    .from("usuarios").select("cargo").eq("id", user?.id ?? "").single<{ cargo: CargoUsuario }>();

  if (!perfil || perfil.cargo !== "admin") redirect("/configuracoes");

  const [config, taxas] = await Promise.all([buscarConfigPrecificacao(), listarTaxasParcelamento()]);
  if (!config) redirect("/configuracoes");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Parcelamento"
        description="Motor de precificação — cadastre o preço líquido desejado no produto, o resto é calculado automaticamente"
      />
      <PrecificacaoPanel config={config} taxas={taxas} />
    </div>
  );
}
