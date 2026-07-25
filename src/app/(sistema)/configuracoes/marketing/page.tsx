import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buscarConfigMarketing, listarBarraTopoItens, listarSelosConfianca } from "@/services/marketing/marketing.service";
import { ConfigGeralPanel } from "@/components/marketing/config-geral-panel";
import { BarraTopoPanel } from "@/components/marketing/barra-topo-panel";
import { SelosConfiancaPanel } from "@/components/marketing/selos-confianca-panel";
import { PageHeader } from "@/components/ui/page-header";
import type { CargoUsuario } from "@/types";

export default async function MarketingConversaoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: perfil } = await supabase
    .from("usuarios").select("cargo").eq("id", user?.id ?? "").single<{ cargo: CargoUsuario }>();

  if (!perfil || !["admin", "gerente"].includes(perfil.cargo)) redirect("/configuracoes");

  const [config, barraItens, selos] = await Promise.all([
    buscarConfigMarketing(), listarBarraTopoItens(), listarSelosConfianca(),
  ]);

  if (!config) redirect("/configuracoes");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Marketing & Conversão" description="Barra superior, selos de confiança, desconto Pix — tudo o que aparece na loja pra gerar confiança" />
      <ConfigGeralPanel config={config} />
      <BarraTopoPanel itens={barraItens} />
      <SelosConfiancaPanel selos={selos} />
    </div>
  );
}
