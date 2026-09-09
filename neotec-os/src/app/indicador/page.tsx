import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Wallet, Users, Smartphone, Wrench } from "lucide-react";
import { formatCurrency, formatDate } from "@/utils";

/**
 * Painel do indicador logado — saldo e histórico de quem ele indicou,
 * com status de cada indicação. RLS (Fase 186) garante que só vê os
 * próprios registros.
 */
export default async function IndicadorPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase.from("usuarios").select("cargo, indicador_id").eq("id", user.id).maybeSingle();
  if (perfil?.cargo !== "indicador" || !perfil.indicador_id) redirect("/login");

  const [{ data: indicador }, { data: movimentos }, { data: indicacoes }] = await Promise.all([
    supabase.from("indicadores").select("nome").eq("id", perfil.indicador_id).maybeSingle(),
    supabase.from("indicador_movimentos").select("*").eq("indicador_id", perfil.indicador_id).order("data", { ascending: false }),
    supabase.from("vw_indicacoes_do_indicador").select("*").eq("indicador_id", perfil.indicador_id).order("data", { ascending: false }),
  ]);

  const saldo = (movimentos ?? []).reduce((acc, m) => acc + (m.tipo === "credito" ? Number(m.valor) : -Number(m.valor)), 0);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Olá, {indicador?.nome ?? "indicador"} 👋</h1>
        <p className="text-sm text-muted-foreground">Suas indicações e saldo na Neotec</p>
      </div>

      <div className="rounded-2xl border border-success/20 bg-success/5 p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-success" />
          <span className="text-xs font-medium uppercase tracking-wide text-success">Saldo atual</span>
        </div>
        <p className="mt-2 font-display text-3xl font-bold text-foreground">{formatCurrency(saldo)}</p>
      </div>

      <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Users className="h-4 w-4" />Pessoas que você indicou
        </h2>
        {(indicacoes ?? []).length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">Nenhuma indicação registrada ainda.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {(indicacoes ?? []).map((i) => (
              <div key={`${i.tipo}-${i.origem_id}`} className="flex items-center justify-between rounded-xl bg-secondary/40 px-3 py-2.5 text-sm">
                <div className="flex items-center gap-2">
                  {i.tipo === "venda" ? <Smartphone className="h-3.5 w-3.5 text-muted-foreground" /> : <Wrench className="h-3.5 w-3.5 text-muted-foreground" />}
                  <div>
                    <p className="font-medium text-foreground">{i.cliente_nome}</p>
                    <p className="text-xs text-muted-foreground">{i.tipo === "venda" ? "Compra de aparelho" : "Assistência técnica"} · {formatDate(i.data)}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs text-muted-foreground">{formatCurrency(i.valor ?? 0)}</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{i.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Movimentações do saldo</h2>
        {(movimentos ?? []).length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">Nenhuma movimentação ainda.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {(movimentos ?? []).map((m) => (
              <div key={m.id} className="flex items-center justify-between border-b border-black/[0.04] pb-2 text-sm last:border-0">
                <div>
                  <p className="text-foreground">{m.tipo === "credito" ? "Crédito" : "Retirada"}{m.motivo && ` — ${m.motivo}`}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(m.data)}</p>
                </div>
                <span className={m.tipo === "credito" ? "font-medium text-success" : "font-medium text-danger"}>
                  {m.tipo === "credito" ? "+" : "-"}{formatCurrency(m.valor)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
