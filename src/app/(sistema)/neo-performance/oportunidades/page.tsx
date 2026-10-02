import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listarOportunidades } from "@/services/neo-performance/oportunidades.service";
import { podeVerCusto } from "@/utils/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { DetectarOportunidadesButton } from "@/components/neo-performance/detectar-oportunidades-button";
import { OportunidadeStatusSelect } from "@/components/neo-performance/oportunidade-status-select";
import type { CargoUsuario } from "@/types";

const TONE_POR_STATUS = {
  descoberta: "neutral", analisando: "info", aprovada: "info", testando: "warning", validada: "success", descartada: "danger",
} as const;

export default async function OportunidadesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: perfil } = await supabase.from("usuarios").select("cargo").eq("id", user?.id ?? "").single<{ cargo: CargoUsuario }>();
  if (!perfil || !podeVerCusto(perfil.cargo)) redirect("/dashboard");

  const oportunidades = await listarOportunidades();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">Central de Oportunidades</h1>
          <p className="text-sm text-muted-foreground">Cruza diagnósticos, estoque e margem pra sugerir onde investir.</p>
        </div>
        <div className="flex items-center gap-2">
          <DetectarOportunidadesButton />
          <Link href="/neo-performance" className="text-sm text-primary hover:underline">← Voltar</Link>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Oportunidades ({oportunidades.length})</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3">
          {oportunidades.map((o) => (
            <div key={o.id} className="rounded-md border border-border p-3 text-sm">
              <div className="flex items-center justify-between">
                <p className="font-medium text-foreground">{o.titulo}</p>
                <StatusBadge label={o.status} tone={TONE_POR_STATUS[o.status]} />
              </div>
              <p className="text-xs text-muted-foreground">Origem: {o.origem}{o.potencial && ` · Potencial: ${o.potencial}`}</p>
              {o.evidencias && <p className="mt-1 text-xs text-foreground">{o.evidencias}</p>}
              <div className="mt-2">
                <OportunidadeStatusSelect id={o.id} statusAtual={o.status} />
              </div>
            </div>
          ))}
          {oportunidades.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma oportunidade ainda — clique em &quot;Detectar oportunidades&quot;.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
