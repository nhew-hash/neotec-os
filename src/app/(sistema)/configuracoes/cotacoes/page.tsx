import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listarMapeamentoEmojiCor, buscarPrioridadeBuscaPreco } from "@/services/cotacoes/cotacoes-config.service";
import { ConfiguracaoCotacoesPanel } from "@/components/cotacoes/configuracao-cotacoes-panel";
import { PageHeader } from "@/components/ui/page-header";
import type { CargoUsuario } from "@/types";

export default async function ConfiguracaoCotacoesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: perfil } = await supabase
    .from("usuarios").select("cargo").eq("id", user?.id ?? "").single<{ cargo: CargoUsuario }>();

  if (!perfil || !["admin", "gerente"].includes(perfil.cargo)) redirect("/configuracoes");

  const [mapeamento, prioridade] = await Promise.all([listarMapeamentoEmojiCor(), buscarPrioridadeBuscaPreco()]);

  if (!prioridade) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Cotações" />
        <p className="text-sm text-danger">Configuração não encontrada — confirme se a migração da Fase 27 foi aplicada.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Cotações" description="Mapeamento de emoji e prioridade de busca de preço" />
      <ConfiguracaoCotacoesPanel mapeamento={mapeamento} prioridade={prioridade} />
    </div>
  );
}
