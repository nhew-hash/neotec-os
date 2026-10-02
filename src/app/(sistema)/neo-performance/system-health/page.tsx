import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { obterSystemHealth } from "@/services/neo-performance/system-health.service";
import { podeGerenciarUsuarios } from "@/utils/permissions";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { CargoUsuario } from "@/types";

export default async function SystemHealthPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: perfil } = await supabase.from("usuarios").select("cargo").eq("id", user?.id ?? "").single<{ cargo: CargoUsuario }>();
  if (!perfil || !podeGerenciarUsuarios(perfil.cargo)) redirect("/neo-performance");

  const itens = await obterSystemHealth();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">System Health</h1>
          <p className="text-sm text-muted-foreground">Status real de cada integração — nunca marca como conectado sem checagem.</p>
        </div>
        <Link href="/neo-performance" className="text-sm text-primary hover:underline">← Voltar ao Performance</Link>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
          {itens.map((item) => (
            <div key={item.nome} className="flex items-center justify-between border-b border-border py-2 text-sm last:border-0">
              <div>
                <p className="font-medium text-foreground">{item.nome}</p>
                <p className="text-xs text-muted-foreground">{item.detalhe}</p>
              </div>
              <StatusBadge
                label={item.status === "conectado" ? "🟢 Conectado" : item.status === "erro" ? "🔴 Erro" : "⚪ Não configurado"}
                tone={item.status === "conectado" ? "success" : item.status === "erro" ? "danger" : "neutral"}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
