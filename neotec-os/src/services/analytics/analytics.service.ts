import { createClient } from "@/lib/supabase/server";

export interface FaturamentoPorDia {
  data: string;
  valor: number;
}

export interface DesempenhoVendedor {
  usuario_id: string;
  nome: string;
  vendas: number;
  faturamento: number;
}

export interface DesempenhoTecnico {
  usuario_id: string;
  nome: string;
  osEntregues: number;
}

export interface ResumoAnalytics {
  faturamentoTotal: number;
  lucroTotal: number;
  vendasTotal: number;
  faturamentoPorDia: FaturamentoPorDia[];
  vendedores: DesempenhoVendedor[];
  tecnicos: DesempenhoTecnico[];
}

/**
 * Analytics é somente admin/gerente (mesma regra de quem vê lucro) — a
 * página que consome este service já checa isso antes de renderizar, mas
 * o service em si não teria como impedir sozinho: quem depende disso é o
 * RLS de `vendas`/`financeiro`, que já bloqueia lucro para outros cargos
 * na origem (mesma garantia usada desde a Fase 1).
 */
export async function obterResumoAnalytics(dias: number = 30): Promise<ResumoAnalytics> {
  const supabase = await createClient();
  const desde = new Date();
  desde.setDate(desde.getDate() - dias);

  const [{ data: vendas }, { data: usuarios }, { data: osEntregues }] = await Promise.all([
    supabase.from("vendas").select("*").gte("data_venda", desde.toISOString()),
    supabase.from("usuarios").select("id, nome"),
    supabase.from("ordens_servico").select("tecnico_id").eq("status", "entregue").gte("data_saida", desde.toISOString()),
  ]);

  const nomePorUsuario = new Map((usuarios ?? []).map((u) => [u.id, u.nome]));

  const faturamentoTotal = (vendas ?? []).reduce((acc, v) => acc + Number(v.valor_total), 0);
  const lucroTotal = (vendas ?? []).reduce((acc, v) => acc + Number(v.lucro ?? 0), 0);

  const porDia = new Map<string, number>();
  (vendas ?? []).forEach((v) => {
    const dia = v.data_venda.slice(0, 10);
    porDia.set(dia, (porDia.get(dia) ?? 0) + Number(v.valor_total));
  });
  const faturamentoPorDia = Array.from(porDia.entries())
    .map(([data, valor]) => ({ data, valor }))
    .sort((a, b) => a.data.localeCompare(b.data));

  const porVendedor = new Map<string, { vendas: number; faturamento: number }>();
  (vendas ?? []).forEach((v) => {
    const atual = porVendedor.get(v.usuario_id) ?? { vendas: 0, faturamento: 0 };
    porVendedor.set(v.usuario_id, { vendas: atual.vendas + 1, faturamento: atual.faturamento + Number(v.valor_total) });
  });
  const vendedores = Array.from(porVendedor.entries())
    .map(([usuario_id, dados]) => ({ usuario_id, nome: nomePorUsuario.get(usuario_id) ?? "—", ...dados }))
    .sort((a, b) => b.faturamento - a.faturamento);

  const porTecnico = new Map<string, number>();
  (osEntregues ?? []).forEach((os) => {
    if (!os.tecnico_id) return;
    porTecnico.set(os.tecnico_id, (porTecnico.get(os.tecnico_id) ?? 0) + 1);
  });
  const tecnicos = Array.from(porTecnico.entries())
    .map(([usuario_id, osEntregues]) => ({ usuario_id, nome: nomePorUsuario.get(usuario_id) ?? "—", osEntregues }))
    .sort((a, b) => b.osEntregues - a.osEntregues);

  return {
    faturamentoTotal,
    lucroTotal,
    vendasTotal: (vendas ?? []).length,
    faturamentoPorDia,
    vendedores,
    tecnicos,
  };
}
