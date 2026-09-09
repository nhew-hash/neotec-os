import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { paymentRepository } from "@/services/pagamentos/payment.repository";
import { MercadoPagoConfigPanel } from "@/components/pagamentos/mercadopago-config-panel";
import { PageHeader } from "@/components/ui/page-header";
import type { CargoUsuario } from "@/types";

export default async function PagamentosConfigPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: perfil } = await supabase
    .from("usuarios").select("cargo").eq("id", user?.id ?? "").single<{ cargo: CargoUsuario }>();

  if (!perfil || perfil.cargo !== "admin") redirect("/configuracoes");

  const config = await paymentRepository.buscarConfiguracao("mercadopago", true);
  if (!config) redirect("/configuracoes");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Pagamentos" description="Configuração do gateway de pagamento online da loja" />
      <MercadoPagoConfigPanel config={config} />
    </div>
  );
}
