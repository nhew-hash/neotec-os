import { createClient } from "@/lib/supabase/server";

export interface PontoVendasPeriodo {
  data: string;
  valor: number;
  quantidade: number;
}

export interface PontoOrigemCliente {
  origem: string;
  quantidade: number;
}

export interface PontoFunilCRM {
  etapa: string;
  quantidade: number;
  cor: string;
}

export interface PontoDesempenhoEquipe {
  usuario: string;
  vendas: number;
  faturamento: number;
}

const ORIGEM_LABEL: Record<string, string> = {
  instagram: "Instagram", google: "Google", indicacao: "Indicação",
  loja_fisica: "Loja física", shopify: "Shopify", outros: "Outros",
};

export async function obterVendasPorPeriodo(dias: number = 14): Promise<PontoVendasPeriodo[]> {
  const supabase = await createClient();
  const inicio = new Date();
  inicio.setDate(inicio.getDate() - dias);
  inicio.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("vendas")
    .select("valor_total, data_venda")
    .eq("status", "concluida")
    .gte("data_venda", inicio.toISOString());

  if (error) throw new Error(`Não foi possível carregar vendas por período: ${error.message}`);

  const porDia = new Map<string, { valor: number; quantidade: number }>();
  for (let i = 0; i < dias; i++) {
    const d = new Date(inicio);
    d.setDate(d.getDate() + i);
    porDia.set(d.toISOString().slice(0, 10), { valor: 0, quantidade: 0 });
  }

  (data ?? []).forEach((v) => {
    const chave = v.data_venda.slice(0, 10);
    const atual = porDia.get(chave);
    if (atual) {
      atual.valor += Number(v.valor_total);
      atual.quantidade += 1;
    }
  });

  return Array.from(porDia.entries()).map(([data, v]) => ({ data, ...v }));
}

export async function obterOrigemClientes(): Promise<PontoOrigemCliente[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("clientes").select("origem").not("origem", "is", null);
  if (error) throw new Error(`Não foi possível carregar origem dos clientes: ${error.message}`);

  const contagem = new Map<string, number>();
  (data ?? []).forEach((c) => {
    if (!c.origem) return;
    contagem.set(c.origem, (contagem.get(c.origem) ?? 0) + 1);
  });

  return Array.from(contagem.entries())
    .map(([origem, quantidade]) => ({ origem: ORIGEM_LABEL[origem] ?? origem, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade);
}

export async function obterFunilCRM(): Promise<PontoFunilCRM[]> {
  const supabase = await createClient();
  const [{ data: etapas }, { data: cards }] = await Promise.all([
    supabase.from("crm_etapas").select("id, nome, ordem, cor").eq("ativa", true).order("ordem"),
    supabase.from("crm_cards").select("etapa_id"),
  ]);

  const contagem = new Map<string, number>();
  (cards ?? []).forEach((c) => contagem.set(c.etapa_id, (contagem.get(c.etapa_id) ?? 0) + 1));

  return (etapas ?? []).map((e) => ({ etapa: e.nome, quantidade: contagem.get(e.id) ?? 0, cor: e.cor }));
}

export async function obterDesempenhoEquipe(dias: number = 30): Promise<PontoDesempenhoEquipe[]> {
  const supabase = await createClient();
  const inicio = new Date();
  inicio.setDate(inicio.getDate() - dias);

  const { data, error } = await supabase
    .from("vendas")
    .select("valor_total, usuario:usuarios(nome)")
    .eq("status", "concluida")
    .gte("data_venda", inicio.toISOString());

  if (error) throw new Error(`Não foi possível carregar desempenho da equipe: ${error.message}`);

  const porUsuario = new Map<string, { vendas: number; faturamento: number }>();
  (data ?? []).forEach((v) => {
    const nome = (v.usuario as unknown as { nome: string } | null)?.nome ?? "Sem vendedor";
    const atual = porUsuario.get(nome) ?? { vendas: 0, faturamento: 0 };
    atual.vendas += 1;
    atual.faturamento += Number(v.valor_total);
    porUsuario.set(nome, atual);
  });

  return Array.from(porUsuario.entries())
    .map(([usuario, v]) => ({ usuario, ...v }))
    .sort((a, b) => b.faturamento - a.faturamento);
}
