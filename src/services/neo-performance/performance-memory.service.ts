import { createClient } from "@/lib/supabase/server";

/**
 * Performance Memory (Seção 31). Não é uma tabela nova — é a leitura
 * combinada do que já existe (decisões, diagnósticos, testes, ofertas),
 * formatada pra ser injetada no prompt do Claude ANTES de propor uma
 * estratégia nova (Seção 31: "a IA deve consultar essa memória antes de
 * propor novas estratégias quando houver histórico relevante").
 */
export async function montarContextoMemoria(produtoOuTema?: string): Promise<string> {
  const supabase = await createClient();

  const [{ data: decisoes }, { data: testes }, { data: ofertas }, { data: diagnosticos }] = await Promise.all([
    supabase.from("performance_decisoes").select("tipo_decisao, motivo, resultado_posterior").order("criado_em", { ascending: false }).limit(20),
    supabase.from("test_lab_testes").select("hipotese, status, resultado, vencedor").eq("status", "concluido").order("concluido_em", { ascending: false }).limit(20),
    supabase.from("ofertas_biblioteca").select("nome, produto, vendas_geradas, cac, lucro").order("created_at", { ascending: false }).limit(20),
    supabase.from("performance_diagnosticos").select("tipo, mensagem").order("criado_em", { ascending: false }).limit(10),
  ]);

  const filtrarPorTema = <T extends { produto?: string | null; hipotese?: string; motivo?: string }>(lista: T[]): T[] =>
    produtoOuTema
      ? lista.filter((item) => JSON.stringify(item).toLowerCase().includes(produtoOuTema.toLowerCase()))
      : lista;

  const partes: string[] = [];

  const testesRelevantes = filtrarPorTema(testes ?? []);
  if (testesRelevantes.length > 0) {
    partes.push("TESTES ANTERIORES:\n" + testesRelevantes.map((t) => `- ${t.hipotese} → ${t.resultado ?? "sem resultado registrado"} (vencedor: ${t.vencedor ?? "indefinido"})`).join("\n"));
  }

  const ofertasRelevantes = filtrarPorTema(ofertas ?? []);
  if (ofertasRelevantes.length > 0) {
    partes.push("OFERTAS JÁ TESTADAS:\n" + ofertasRelevantes.map((o) => `- ${o.nome} (${o.produto ?? "produto não informado"}): ${o.vendas_geradas} vendas, CAC ${o.cac ?? "—"}, lucro ${o.lucro ?? "—"}`).join("\n"));
  }

  if ((decisoes ?? []).length > 0) {
    partes.push("DECISÕES RECENTES:\n" + (decisoes ?? []).map((d) => `- ${d.tipo_decisao}: ${d.motivo} (resultado: ${d.resultado_posterior ?? "aguardando avaliação"})`).join("\n"));
  }

  if ((diagnosticos ?? []).length > 0) {
    partes.push("DIAGNÓSTICOS RECENTES:\n" + (diagnosticos ?? []).map((d) => `- [${d.tipo}] ${d.mensagem}`).join("\n"));
  }

  if (partes.length === 0) return "Sem histórico relevante registrado ainda — não há memória de performance pra consultar neste tema.";
  return partes.join("\n\n");
}
