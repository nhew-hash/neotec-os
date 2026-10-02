import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buscarConfig, listarFlags } from "@/services/neo-performance/config.service";
import { listarContas } from "@/services/neo-performance/ads.service";
import { podeGerenciarUsuarios } from "@/utils/permissions";
import { ConfigPerformanceForm } from "@/components/neo-performance/config-performance-form";
import { FeatureFlagsList } from "@/components/neo-performance/feature-flags-list";
import { ConectarContaForm } from "@/components/neo-performance/conectar-conta-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CargoUsuario } from "@/types";

export default async function NeoPerformanceConfiguracoesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: perfil } = await supabase
    .from("usuarios").select("cargo").eq("id", user?.id ?? "").single<{ cargo: CargoUsuario }>();

  // Mesma regra de quem mexe em Configurações do sistema — só admin.
  if (!perfil || !podeGerenciarUsuarios(perfil.cargo)) redirect("/neo-performance");

  const [config, flags, contas] = await Promise.all([buscarConfig(), listarFlags(), listarContas()]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Configurações do NEO Performance</h1>
        <p className="text-sm text-muted-foreground">Perfil da empresa, limites de orçamento, contas de anúncio e feature flags.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Perfil de Performance e limites de orçamento</CardTitle></CardHeader>
        <CardContent><ConfigPerformanceForm config={config} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Contas de anúncio</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3">
          {contas.map((c) => (
            <div key={c.id} className="flex items-center justify-between text-sm">
              <span className="text-foreground">{c.plataforma === "meta" ? "Meta Ads" : "Google Ads"} — {c.nome ?? c.conta_externa_id}</span>
              <span className="text-xs text-muted-foreground">{c.ativo ? "Conectada" : "Inativa"}</span>
            </div>
          ))}
          {contas.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma conta conectada ainda.</p>}
          <ConectarContaForm />
          <p className="text-xs text-muted-foreground">
            A sincronização automática de campanhas/métricas depende de token de acesso do Meta/Google, que ainda não está
            configurado no projeto (variáveis de ambiente). Conectar a conta aqui só guarda o ID — a leitura real dos dados
            da API entra quando essas credenciais existirem.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Feature flags</CardTitle></CardHeader>
        <CardContent><FeatureFlagsList flags={flags} /></CardContent>
      </Card>
    </div>
  );
}
