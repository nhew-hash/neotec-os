import { createClient } from "@/lib/supabase/server";

export interface FiadorResumo { id: string; nome: string; cpf: string; status_analise: string; created_at: string }

export async function listarFiadores(): Promise<FiadorResumo[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("crediario_fiadores").select("id, nome, cpf, status_analise, created_at").order("created_at", { ascending: false });
  return data ?? [];
}

export interface FiadorDetalhe {
  id: string; nome: string; cpf: string; rg: string | null; data_nascimento: string | null;
  telefone: string | null; email: string | null; endereco: string | null; cidade: string | null; estado: string | null;
  profissao: string | null; renda_declarada: number | null; relacao_com_cliente: string | null;
  status_analise: string; observacoes: string | null;
}

export async function buscarFiadorPorId(id: string): Promise<FiadorDetalhe | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("crediario_fiadores").select("*").eq("id", id).maybeSingle();
  return data ?? null;
}

export interface PropostaResumo {
  id: string; status: string; score_neotec: number | null; classe_nome: string | null;
  limite_recomendado: number | null; cliente_nome: string; created_at: string;
}

export async function listarPropostas(): Promise<PropostaResumo[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("crediario_propostas")
    .select("id, status, score_neotec, limite_recomendado, created_at, cliente:clientes(nome), classe:crediario_classes(nome)")
    .order("created_at", { ascending: false });

  return (data ?? []).map((p) => {
    const cliente = p.cliente as unknown as { nome: string } | null;
    const classe = p.classe as unknown as { nome: string } | null;
    return { id: p.id, status: p.status, score_neotec: p.score_neotec, limite_recomendado: p.limite_recomendado, cliente_nome: cliente?.nome ?? "—", classe_nome: classe?.nome ?? null, created_at: p.created_at };
  });
}

export interface PropostaDetalhe {
  id: string; status: string; score_neotec: number | null; limite_recomendado: number | null;
  possui_restricao: boolean; observacoes: string | null; motivo_decisao: string | null;
  cliente: { id: string; nome: string; cpf: string | null } | null;
  classe: { id: string; nome: string; encargos_pct: number; prazo_maximo_meses: number; fiador_obrigatorio: boolean; frequencias_permitidas: string[] } | null;
  fiador: { id: string; nome: string; status_analise: string } | null;
}

export async function buscarPropostaPorId(id: string): Promise<PropostaDetalhe | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("crediario_propostas")
    .select("*, cliente:clientes(id, nome, cpf), classe:crediario_classes(id, nome, encargos_pct, prazo_maximo_meses, fiador_obrigatorio, frequencias_permitidas), fiador:crediario_fiadores(id, nome, status_analise)")
    .eq("id", id)
    .maybeSingle();
  return data as unknown as PropostaDetalhe | null;
}

export interface OfertaResumo {
  id: string; produto_id: string; produto_nome: string; frequencia_pagamento: string;
  valor_entrada: number; numero_pagamentos: number; valor_pagamento: number; valor_total_contratado: number;
  status: string; motivo_indisponivel: string | null; selecionada: boolean;
}

export async function listarOfertasDaProposta(propostaId: string): Promise<OfertaResumo[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("crediario_ofertas").select("*, produto:produtos(nome)").eq("proposta_id", propostaId).order("created_at");
  return (data ?? []).map((o) => ({ ...o, produto_nome: (o.produto as unknown as { nome: string } | null)?.nome ?? "Aparelho" }));
}

export interface HistoricoClienteCrediario {
  score_atual: number | null; limite_atual: number; limite_disponivel: number;
  contratos_concluidos: number; contratos_ativos: number; parcelas_pagas: number; parcelas_atrasadas: number;
  dias_medios_atraso: number; maior_atraso_dias: number;
}

export async function buscarHistoricoCliente(clienteId: string): Promise<HistoricoClienteCrediario | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("crediario_cliente_historico").select("*").eq("cliente_id", clienteId).maybeSingle();
  return data ?? null;
}

export interface ParcelaResumo {
  id: string; numero: number; frequencia: string; valor_original: number; vencimento: string;
  status: string; valor_pago: number | null; data_pagamento: string | null; dias_atraso: number;
}

export async function listarParcelasDoContrato(contratoId: string): Promise<ParcelaResumo[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("crediario_parcelas").select("*").eq("contrato_id", contratoId).order("numero");
  return data ?? [];
}

export interface ClasseResumo {
  id: string; nome: string; ordem: number; score_minimo: number; score_maximo: number;
  limite_maximo: number; entrada_minima_pct: number; prazo_maximo_meses: number; encargos_pct: number;
  fiador_obrigatorio: boolean; frequencias_permitidas: string[]; ativa: boolean;
}

export async function listarClasses(): Promise<ClasseResumo[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("crediario_classes").select("*").order("ordem");
  return data ?? [];
}

export interface AparelhoConfigCrediario {
  id: string; produto_id: string; produto_nome: string; valor_referencia: number;
  entrada_minima: number; prazo_maximo_meses: number; valor_opcao_aquisicao: number | null; ativo: boolean;
}

export async function listarAparelhosConfigCrediario(): Promise<AparelhoConfigCrediario[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("crediario_aparelhos_config").select("*, produto:produtos(nome)").order("created_at");
  return (data ?? []).map((a) => ({ ...a, produto_nome: (a.produto as unknown as { nome: string } | null)?.nome ?? "—" }));
}

export interface DashboardCrediario {
  carteiraAtiva: number; valorContratado: number; valorAReceber: number; recebido: number;
  emAtraso: number; taxaInadimplencia: number; exposicaoTotal: number;
}

export async function obterDashboardCrediario(): Promise<DashboardCrediario> {
  const supabase = await createClient();

  const [{ count: contratosAtivos }, { data: parcelas }, { data: aparelhosEmLocacao }] = await Promise.all([
    supabase.from("contratos").select("*", { count: "exact", head: true }).eq("status", "ativo").not("proposta_id", "is", null),
    supabase.from("crediario_parcelas").select("valor_original, valor_pago, status"),
    supabase.from("aparelhos").select("custo").eq("status_crediario", "em_locacao"),
  ]);

  const valorContratado = (parcelas ?? []).reduce((acc, p) => acc + Number(p.valor_original), 0);
  const recebido = (parcelas ?? []).filter((p) => p.status === "pago").reduce((acc, p) => acc + Number(p.valor_pago ?? p.valor_original), 0);
  const emAtraso = (parcelas ?? []).filter((p) => p.status === "atrasado").reduce((acc, p) => acc + Number(p.valor_original), 0);
  const totalParcelas = (parcelas ?? []).length;
  const parcelasAtrasadas = (parcelas ?? []).filter((p) => p.status === "atrasado").length;
  const exposicaoTotal = (aparelhosEmLocacao ?? []).reduce((acc, a) => acc + Number(a.custo), 0);

  return {
    carteiraAtiva: contratosAtivos ?? 0, valorContratado, valorAReceber: valorContratado - recebido, recebido, emAtraso,
    taxaInadimplencia: totalParcelas > 0 ? Math.round((parcelasAtrasadas / totalParcelas) * 1000) / 10 : 0, exposicaoTotal,
  };
}

export interface DashboardRisco {
  clientesPorClasse: { classe: string; quantidade: number }[];
  taxaPagamento: number; taxaAtraso: number; ticketMedio: number; perdaPor1000: number;
}

export async function obterDashboardRisco(): Promise<DashboardRisco> {
  const supabase = await createClient();

  const [{ data: propostasAprovadas }, { data: parcelas }, { data: contratos }] = await Promise.all([
    supabase.from("crediario_propostas").select("classe:crediario_classes(nome)").eq("status", "convertida_contrato"),
    supabase.from("crediario_parcelas").select("valor_original, status"),
    supabase.from("contratos").select("valor_pagamento").not("proposta_id", "is", null),
  ]);

  const contagemPorClasse = new Map<string, number>();
  for (const p of propostasAprovadas ?? []) {
    const nome = (p.classe as unknown as { nome: string } | null)?.nome ?? "Sem classe";
    contagemPorClasse.set(nome, (contagemPorClasse.get(nome) ?? 0) + 1);
  }

  const totalParcelas = (parcelas ?? []).length;
  const pagas = (parcelas ?? []).filter((p) => p.status === "pago").length;
  const atrasadas = (parcelas ?? []).filter((p) => p.status === "atrasado").length;
  const valorTotalContratos = (contratos ?? []).reduce((acc, c) => acc + Number(c.valor_pagamento ?? 0), 0);
  const perdaEstimada = (parcelas ?? []).filter((p) => p.status === "atrasado").reduce((acc, p) => acc + Number(p.valor_original), 0);

  return {
    clientesPorClasse: Array.from(contagemPorClasse.entries()).map(([classe, quantidade]) => ({ classe, quantidade })),
    taxaPagamento: totalParcelas > 0 ? Math.round((pagas / totalParcelas) * 1000) / 10 : 0,
    taxaAtraso: totalParcelas > 0 ? Math.round((atrasadas / totalParcelas) * 1000) / 10 : 0,
    ticketMedio: (contratos ?? []).length > 0 ? valorTotalContratos / (contratos ?? []).length : 0,
    perdaPor1000: valorTotalContratos > 0 ? Math.round((perdaEstimada / valorTotalContratos) * 1000) : 0,
  };
}

/**
 * Régua de cobrança automática (Fase 19/20 do documento) — roda 1x
 * por dia, olha cada parcela em aberto, calcula quantos dias faltam/
 * passaram do vencimento, e dispara a mensagem configurada pra esse
 * offset exato (se existir). Nunca manda 2x a mesma mensagem pro
 * mesmo dia — checa se já existe evento registrado antes de enviar.
 */
export async function executarReguaCobranca(): Promise<{ enviadas: number; escaladas: number }> {
  const supabase = await createClient();
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const { data: regua } = await supabase.from("crediario_regua_cobranca").select("*").eq("ativo", true);
  const { data: parcelasAbertas } = await supabase.from("crediario_parcelas").select("*, contrato:contratos(cliente_id, cliente:clientes(nome, whatsapp))").in("status", ["pendente", "vencendo", "atrasado"]);

  let enviadas = 0;
  let escaladas = 0;

  for (const parcela of parcelasAbertas ?? []) {
    const vencimento = new Date(`${parcela.vencimento}T12:00:00`);
    vencimento.setHours(0, 0, 0, 0);
    const diasOffset = Math.round((hoje.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24));

    const regraDoDia = (regua ?? []).find((r) => r.dias_offset === diasOffset);
    if (!regraDoDia) continue;

    const { count: jaEnviado } = await supabase.from("crediario_cobranca_eventos").select("*", { count: "exact", head: true }).eq("parcela_id", parcela.id).eq("tipo", `regua_d${diasOffset}`);
    if ((jaEnviado ?? 0) > 0) continue;

    const contrato = parcela.contrato as unknown as { cliente_id: string; cliente: { nome: string; whatsapp: string } | null } | null;
    if (!contrato?.cliente?.whatsapp) continue;

    if (regraDoDia.mensagem === "ENCAMINHAR_HUMANO") {
      await supabase.from("crediario_conversas").update({ bot_ativo: false }).eq("telefone", contrato.cliente.whatsapp);
      await supabase.from("crediario_cobranca_eventos").insert({ parcela_id: parcela.id, tipo: `regua_d${diasOffset}`, descricao: "Atraso além do limite configurado — encaminhado pra humano" });
      escaladas++;
      continue;
    }

    const mensagemPersonalizada = regraDoDia.mensagem.replace("{{NOME}}", contrato.cliente.nome.split(" ")[0]);
    const { enviarMensagemCobranca } = await import("./whatsapp/cobranca-whatsapp.provider");
    const resultado = await enviarMensagemCobranca(contrato.cliente.whatsapp, mensagemPersonalizada);

    if (resultado.enviado) {
      await supabase.from("crediario_cobranca_eventos").insert({ parcela_id: parcela.id, tipo: `regua_d${diasOffset}`, descricao: mensagemPersonalizada });
      enviadas++;
    }

    // Marca a parcela como atrasada quando passou do vencimento — dado real, não só pra régua.
    if (diasOffset > 0 && parcela.status !== "atrasado") {
      await supabase.from("crediario_parcelas").update({ status: "atrasado", dias_atraso: diasOffset }).eq("id", parcela.id);
    } else if (diasOffset >= -3 && diasOffset < 0 && parcela.status === "pendente") {
      await supabase.from("crediario_parcelas").update({ status: "vencendo" }).eq("id", parcela.id);
    }
  }

  return { enviadas, escaladas };
}
