import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buscarIntegracaoWhatsapp } from "@/services/integracoes/integracoes-whatsapp.service";
import { WhatsappIntegracaoPanel } from "@/components/configuracoes/whatsapp-integracao-panel";
import { PageHeader } from "@/components/ui/page-header";
import type { CargoUsuario } from "@/types";

export default async function IntegracaoWhatsappPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: perfil } = await supabase
    .from("usuarios").select("cargo").eq("id", user?.id ?? "").single<{ cargo: CargoUsuario }>();

  // Configuração sensível — mesma regra do RLS, checada de novo aqui pra
  // já não renderizar nada indevido em vez de deixar a query falhar silenciosa.
  if (!perfil || !["admin", "gerente"].includes(perfil.cargo)) redirect("/configuracoes");

  const integracao = await buscarIntegracaoWhatsapp();
  if (!integracao) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Integração WhatsApp" />
        <p className="text-sm text-danger">
          Nenhuma linha de configuração encontrada — confirme se a migração da Fase 22 foi aplicada.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Integração WhatsApp" description="Escolha e configure como o Neotec OS envia e recebe mensagem." />
      <WhatsappIntegracaoPanel integracaoInicial={integracao} />
    </div>
  );
}
