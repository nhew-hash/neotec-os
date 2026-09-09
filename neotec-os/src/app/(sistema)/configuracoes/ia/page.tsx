import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buscarConfiguracaoIA } from "@/services/ia/ia.service";
import { chavesConfiguradas } from "@/services/ia/providers/ia-provider-resolver";
import { obterEstatisticasUsoIA } from "@/services/ia/ia-estatisticas.service";
import { IAConfigPanel } from "@/components/configuracoes/ia-config-panel";
import { PageHeader } from "@/components/ui/page-header";
import type { CargoUsuario } from "@/types";

export default async function ConfiguracaoIAPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: perfil } = await supabase
    .from("usuarios").select("cargo").eq("id", user?.id ?? "").single<{ cargo: CargoUsuario }>();

  if (!perfil || !["admin", "gerente"].includes(perfil.cargo)) redirect("/configuracoes");

  const [configuracao, estatisticas] = await Promise.all([buscarConfiguracaoIA(), obterEstatisticasUsoIA()]);

  if (!configuracao) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="IA" />
        <p className="text-sm text-danger">
          Nenhuma linha de configuração encontrada — confirme se a migração da Fase 26 foi aplicada.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="IA"
        description="Provedor, modelo e comportamento da IA usada pelos módulos do Neotec OS (Central de Cotações e futuros)."
      />
      <IAConfigPanel configuracao={configuracao} chaves={chavesConfiguradas()} estatisticas={estatisticas} />
    </div>
  );
}
