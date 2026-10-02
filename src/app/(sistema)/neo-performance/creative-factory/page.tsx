import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listarBriefs } from "@/services/neo-performance/creative-factory.service";
import { listarTestes } from "@/services/neo-performance/test-lab.service";
import { flagAtiva } from "@/services/neo-performance/config.service";
import { podeVerCusto } from "@/utils/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { NovoBriefForm } from "@/components/neo-performance/novo-brief-form";
import { GerarRoteiroButton } from "@/components/neo-performance/gerar-roteiro-button";
import { NovoTesteForm } from "@/components/neo-performance/novo-teste-form";
import { AcaoTesteButtons } from "@/components/neo-performance/acao-teste-buttons";
import type { CargoUsuario } from "@/types";

export default async function CreativeFactoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: perfil } = await supabase.from("usuarios").select("cargo").eq("id", user?.id ?? "").single<{ cargo: CargoUsuario }>();
  if (!perfil || !podeVerCusto(perfil.cargo)) redirect("/dashboard");

  // Flag "creative_factory" (Seção 62) — nasce desligada.
  if (!(await flagAtiva("creative_factory"))) redirect("/neo-performance/configuracoes");

  const [briefs, testes] = await Promise.all([listarBriefs(), listarTestes()]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">Creative Factory + Test Lab</h1>
          <p className="text-sm text-muted-foreground">Objetivo → Produto → Público → Hipótese → Hook → Roteiro → Copy → Teste → Resultado.</p>
        </div>
        <Link href="/neo-performance" className="text-sm text-primary hover:underline">← Voltar ao Performance</Link>
      </div>

      <Card>
        <CardHeader><CardTitle>Novo brief</CardTitle></CardHeader>
        <CardContent><NovoBriefForm /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Briefs ({briefs.length})</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3">
          {briefs.map((b) => (
            <div key={b.id} className="rounded-md border border-border p-3 text-sm">
              <div className="flex items-center justify-between">
                <p className="font-medium text-foreground">{b.objetivo}</p>
                <StatusBadge label={b.status} tone={b.status === "pronto" ? "success" : b.status === "em_teste" ? "info" : "neutral"} />
              </div>
              {b.produto && <p className="text-xs text-muted-foreground">Produto: {b.produto}</p>}
              {b.roteiro && <p className="mt-2 whitespace-pre-wrap text-xs text-foreground">{b.roteiro}</p>}
              {b.copy && <p className="mt-1 text-xs italic text-muted-foreground">{b.copy}</p>}
              {!b.roteiro && <GerarRoteiroButton briefId={b.id} />}
            </div>
          ))}
          {briefs.length === 0 && <p className="text-sm text-muted-foreground">Nenhum brief criado.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Novo teste</CardTitle></CardHeader>
        <CardContent><NovoTesteForm /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Test Lab ({testes.length})</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3">
          {testes.map((t) => (
            <div key={t.id} className="rounded-md border border-border p-3 text-sm">
              <div className="flex items-center justify-between">
                <p className="font-medium text-foreground">{t.hipotese}</p>
                <StatusBadge
                  label={t.status}
                  tone={t.status === "concluido" ? "success" : t.status === "dados_insuficientes" ? "warning" : t.status === "rodando" ? "info" : "neutral"}
                />
              </div>
              <p className="text-xs text-muted-foreground">Variável: {t.variavel} · Controle: {t.controle} · Métrica: {t.metrica_principal}</p>
              <p className="text-xs text-muted-foreground">Mínimo: {t.duracao_minima_dias} dias / {t.amostra_minima} amostra</p>
              {t.resultado && <p className="mt-1 text-xs text-foreground">{t.resultado}</p>}
              <AcaoTesteButtons id={t.id} status={t.status} />
            </div>
          ))}
          {testes.length === 0 && <p className="text-sm text-muted-foreground">Nenhum teste criado.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
