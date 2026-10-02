import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listarRegras, killSwitchAtivo, obterModoAutonomia } from "@/services/neo-performance/automation-engine.service";
import { listarDecisoes } from "@/services/neo-performance/decisoes.service";
import { flagAtiva } from "@/services/neo-performance/config.service";
import { podeGerenciarUsuarios } from "@/utils/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { KillSwitchPanel } from "@/components/neo-performance/kill-switch-panel";
import { ModoAutonomiaSelect } from "@/components/neo-performance/modo-autonomia-select";
import { NovaRegraForm } from "@/components/neo-performance/nova-regra-form";
import { RegraAcoesButtons } from "@/components/neo-performance/regra-acoes-buttons";
import type { CargoUsuario } from "@/types";

export default async function AutomacaoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: perfil } = await supabase.from("usuarios").select("cargo").eq("id", user?.id ?? "").single<{ cargo: CargoUsuario }>();

  // Automação move orçamento — mesma régua de quem gerencia usuários/configurações críticas: só admin.
  if (!perfil || !podeGerenciarUsuarios(perfil.cargo)) redirect("/neo-performance");

  // Flag "automation_engine" (Seção 62) — nasce desligada; kill switch também nasce travado (fase260).
  if (!(await flagAtiva("automation_engine"))) redirect("/neo-performance/configuracoes");

  const [regras, pausado, modo, decisoes] = await Promise.all([listarRegras(), killSwitchAtivo(), obterModoAutonomia(), listarDecisoes()]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">Automation Engine</h1>
          <p className="text-sm text-muted-foreground">Regras SE/E/ENTÃO, nível de autonomia, kill switch e auditoria de decisões.</p>
        </div>
        <Link href="/neo-performance" className="text-sm text-primary hover:underline">← Voltar ao Performance</Link>
      </div>

      <Card className={pausado ? "border-warning" : "border-success"}>
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{pausado ? "Automações PARADAS (kill switch ativo)" : "Automações ativas"}</p>
              <p className="text-xs text-muted-foreground">A análise continua funcionando mesmo com o kill switch ativo — só ações automáticas ficam bloqueadas.</p>
            </div>
            <KillSwitchPanel pausado={pausado} />
          </div>
          <div className="flex items-center gap-2 border-t border-border pt-3">
            <span className="text-sm text-muted-foreground">Modo de autonomia:</span>
            <ModoAutonomiaSelect modoAtual={modo} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardContent className="p-4 text-xs text-muted-foreground">
          Nenhum modo aqui altera orçamento de verdade no Meta/Google Ads ainda — não existe write-API configurada no projeto.
          Mesmo em Modo Controlado/Autônomo, as ações ficam registradas como &quot;aguardando avaliação&quot; (ver Centro de Decisões abaixo)
          até essa integração existir. Isso é proposital: evita fingir uma automação que não roda de fato.
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Nova regra</CardTitle></CardHeader>
        <CardContent><NovaRegraForm /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Regras ({regras.length})</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-2">
          {regras.map((r) => (
            <div key={r.id} className="flex items-center justify-between border-b border-border py-2 text-sm last:border-0">
              <div>
                <p className="font-medium text-foreground">{r.nome}</p>
                <p className="text-xs text-muted-foreground">{r.condicoes.map((c) => `${c.campo} ${c.operador} ${c.valor}`).join(" E ")} → {r.acao}</p>
              </div>
              <RegraAcoesButtons id={r.id} ativa={r.ativa} regra={r} />
            </div>
          ))}
          {regras.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma regra criada.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Centro de decisões ({decisoes.length})</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-2">
          {decisoes.slice(0, 20).map((d) => (
            <div key={d.id} className="border-b border-border py-2 text-sm last:border-0">
              <div className="flex items-center justify-between">
                <p className="font-medium text-foreground">{d.tipo_decisao}</p>
                <StatusBadge label={d.status} tone={d.status === "avaliado" ? "success" : d.status === "aguardando_avaliacao" ? "warning" : "neutral"} />
              </div>
              <p className="text-xs text-muted-foreground">{d.motivo}</p>
              {d.resultado_esperado && <p className="text-xs text-muted-foreground">Esperado: {d.resultado_esperado}</p>}
            </div>
          ))}
          {decisoes.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma decisão registrada ainda.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
