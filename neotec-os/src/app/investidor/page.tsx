import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TrendingUp, Smartphone, Wallet, PiggyBank } from "lucide-react";
import { formatCurrency, formatDate } from "@/utils";

/**
 * Painel do investidor logado — só o próprio resumo financeiro e os
 * próprios aparelhos em estoque. RLS (Fase 186) já garante que as
 * consultas abaixo só retornam dado desse investidor específico, mas
 * a página também confirma o cargo antes de renderizar, por clareza.
 */
export default async function InvestidorPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase.from("usuarios").select("cargo, investidor_id").eq("id", user.id).maybeSingle();
  if (perfil?.cargo !== "investidor" || !perfil.investidor_id) redirect("/login");

  const [{ data: resumo }, { data: aparelhos }, { data: movimentos }] = await Promise.all([
    supabase.from("vw_investidor_resumo").select("*").eq("investidor_id", perfil.investidor_id).maybeSingle(),
    supabase.from("aparelhos").select("id, imei, cor, memoria, condicao, status, custo, produto:produtos(nome)").eq("investidor_id", perfil.investidor_id).order("data_entrada", { ascending: false }),
    supabase.from("investidor_movimentos").select("*").eq("investidor_id", perfil.investidor_id).order("data", { ascending: false }).limit(10),
  ]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-4 sm:p-8">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Olá, {resumo?.nome ?? "investidor"} 👋</h1>
        <p className="text-sm text-muted-foreground">Seu resumo como investidor Neotec</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CardResumo icon={PiggyBank} label="Capital investido" valor={formatCurrency(resumo?.capital_investido ?? 0)} />
        <CardResumo icon={Smartphone} label="Capital aplicado" valor={formatCurrency(resumo?.capital_aplicado ?? 0)} sublabel="em estoque agora" />
        <CardResumo icon={Wallet} label="Capital livre" valor={formatCurrency(resumo?.capital_livre ?? 0)} />
        <CardResumo icon={TrendingUp} label="Lucro acumulado" valor={formatCurrency(resumo?.lucro ?? 0)} destaque sublabel={`${resumo?.rentabilidade_pct ?? 0}% de rentabilidade`} />
      </div>

      <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Seus aparelhos no estoque</h2>
        {(aparelhos ?? []).length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">Nenhum aparelho seu em estoque no momento.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {(aparelhos ?? []).map((a) => {
              const produto = a.produto as unknown as { nome: string } | null;
              return (
                <div key={a.id} className="flex items-center justify-between rounded-xl bg-secondary/40 px-3 py-2.5 text-sm">
                  <div>
                    <p className="font-medium text-foreground">{produto?.nome ?? "—"} {a.cor && `· ${a.cor}`} {a.memoria && `· ${a.memoria}`}</p>
                    <p className="text-xs text-muted-foreground">{a.condicao === "novo" ? "Lacrado" : "Seminovo"} · IMEI {a.imei}</p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-muted-foreground">{a.status}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Últimas movimentações</h2>
        {(movimentos ?? []).length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">Nenhuma movimentação ainda.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {(movimentos ?? []).map((m) => (
              <div key={m.id} className="flex items-center justify-between border-b border-black/[0.04] pb-2 text-sm last:border-0">
                <div>
                  <p className="text-foreground">{m.tipo === "aporte" ? "Aporte" : "Saque"}{m.observacao && ` — ${m.observacao}`}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(m.data)}</p>
                </div>
                <span className={m.tipo === "aporte" ? "font-medium text-success" : "font-medium text-danger"}>
                  {m.tipo === "aporte" ? "+" : "-"}{formatCurrency(m.valor)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CardResumo({ icon: Icon, label, valor, sublabel, destaque }: { icon: typeof TrendingUp; label: string; valor: string; sublabel?: string; destaque?: boolean }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${destaque ? "text-success" : "text-primary"}`} />
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <span className={`font-display text-xl font-bold ${destaque ? "text-success" : "text-foreground"}`}>{valor}</span>
      {sublabel && <span className="text-[11px] text-muted-foreground">{sublabel}</span>}
    </div>
  );
}
