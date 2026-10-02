import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listarReferencias } from "@/services/neo-performance/referencias.service";
import { listarHooks, listarOfertas } from "@/services/neo-performance/hooks-ofertas.service";
import { flagAtiva } from "@/services/neo-performance/config.service";
import { podeVerCusto } from "@/utils/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/utils";
import { NovaReferenciaForm } from "@/components/neo-performance/nova-referencia-form";
import type { CargoUsuario } from "@/types";

export default async function NeoPerformanceInteligenciaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: perfil } = await supabase.from("usuarios").select("cargo").eq("id", user?.id ?? "").single<{ cargo: CargoUsuario }>();
  if (!perfil || !podeVerCusto(perfil.cargo)) redirect("/dashboard");

  // Flag "creative_intelligence" (Seção 62) — nasce desligada; liga em Configurações quando quiser ativar esta parte.
  if (!(await flagAtiva("creative_intelligence"))) redirect("/neo-performance/configuracoes");

  const [referencias, hooks, ofertas] = await Promise.all([listarReferencias(), listarHooks(), listarOfertas()]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">Central de Inteligência</h1>
          <p className="text-sm text-muted-foreground">Referências criativas, biblioteca de hooks e de ofertas.</p>
        </div>
        <Link href="/neo-performance" className="text-sm text-primary hover:underline">← Voltar ao Performance</Link>
      </div>

      <Card>
        <CardHeader><CardTitle>Nova referência</CardTitle></CardHeader>
        <CardContent><NovaReferenciaForm /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Referências ({referencias.length})</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-2">
          {referencias.map((r) => (
            <div key={r.id} className="flex items-center justify-between border-b border-border py-2 text-sm last:border-0">
              <div>
                <span className="font-medium text-foreground">{r.origem}</span>
                {r.hook && <span className="ml-2 text-muted-foreground">— hook: {r.hook}</span>}
              </div>
              <StatusBadge label={r.status} tone={r.status === "validada" || r.status === "escalavel" ? "success" : r.status === "saturada" ? "danger" : "info"} />
            </div>
          ))}
          {referencias.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma referência registrada ainda.</p>}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Hook Library</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2">
            {hooks.map((h) => (
              <div key={h.id} className="border-b border-border py-2 text-sm last:border-0">
                <p className="text-foreground">{h.texto}</p>
                <p className="text-xs text-muted-foreground">{h.categoria} · {h.quantidade_testes} teste(s) · {h.taxa_sucesso != null ? `${h.taxa_sucesso.toFixed(0)}% sucesso` : "sem dado"}</p>
              </div>
            ))}
            {hooks.length === 0 && <p className="text-sm text-muted-foreground">Nenhum hook cadastrado.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Biblioteca de ofertas</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2">
            {ofertas.map((o) => (
              <div key={o.id} className="border-b border-border py-2 text-sm last:border-0">
                <p className="text-foreground">{o.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {o.vendas_geradas} vendas{o.cac != null && ` · CAC ${formatCurrency(o.cac)}`}{o.lucro != null && ` · lucro ${formatCurrency(o.lucro)}`}
                </p>
              </div>
            ))}
            {ofertas.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma oferta registrada.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
