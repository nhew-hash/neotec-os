import { redirect } from "next/navigation";
import Link from "next/link";
import { History } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { buscarPreferenciasCompletas } from "@/services/impressao/impressoras.service";
import { assinaturaDigitalHabilitada } from "@/services/impressao/assinatura.service";
import { ImpressorasPanel } from "@/components/impressao/impressoras-panel";
import { AssociacaoDocumentoPanel } from "@/components/impressao/associacao-documento-panel";
import { ToggleAssinaturaDigital } from "@/components/impressao/toggle-assinatura-digital";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import type { CargoUsuario } from "@/types";

export default async function ConfiguracaoImpressaoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: perfil } = await supabase
    .from("usuarios").select("cargo").eq("id", user?.id ?? "").single<{ cargo: CargoUsuario }>();

  if (!perfil || !["admin", "gerente"].includes(perfil.cargo)) redirect("/configuracoes");
  if (!user) redirect("/login");

  const [{ impressoras, preferenciasLoja, preferenciasUsuario }, assinaturaHabilitada] = await Promise.all([
    buscarPreferenciasCompletas(user.id),
    assinaturaDigitalHabilitada(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Impressão"
        description="Cadastro de impressoras e associação por documento"
        actions={
          <Button variant="outline" asChild>
            <Link href="/configuracoes/impressao/historico"><History className="h-4 w-4" />Histórico</Link>
          </Button>
        }
      />
      <ImpressorasPanel impressoras={impressoras} />
      <AssociacaoDocumentoPanel impressoras={impressoras} preferenciasLoja={preferenciasLoja} preferenciasUsuario={preferenciasUsuario} />
      <ToggleAssinaturaDigital habilitadaInicial={assinaturaHabilitada} />
    </div>
  );
}
