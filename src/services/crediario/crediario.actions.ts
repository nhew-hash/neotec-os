"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types";

async function registrarAuditoria(entidade: string, entidadeId: string, acao: string, usuarioId: string | null, dadosDepois?: Record<string, unknown>) {
  const supabase = await createClient();
  await supabase.from("crediario_auditoria").insert({ entidade, entidade_id: entidadeId, acao, usuario_id: usuarioId, dados_depois: dadosDepois ?? null });
}

/** Confere permissão granular — admin sempre passa, resto precisa ter a permissão específica cadastrada. */
async function temPermissao(permissao: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: perfil } = await supabase.from("usuarios").select("cargo").eq("id", user.id).maybeSingle();
  if (perfil?.cargo === "admin") return true;
  const { data } = await supabase.from("crediario_permissoes_usuario").select("permissao").eq("usuario_id", user.id).eq("permissao", permissao).maybeSingle();
  return !!data;
}

export async function criarFiadorAction(formData: FormData): Promise<ActionResult<{ fiadorId: string }>> {
  try {
    const supabase = await createClient();
    const nome = String(formData.get("nome") ?? "").trim();
    const cpf = String(formData.get("cpf") ?? "").trim();
    if (!nome || !cpf) return { success: false, error: "Nome e CPF são obrigatórios" };

    const { data, error } = await supabase.from("crediario_fiadores").insert({
      nome, cpf, rg: String(formData.get("rg") ?? "").trim() || null,
      telefone: String(formData.get("telefone") ?? "").trim() || null, email: String(formData.get("email") ?? "").trim() || null,
      endereco: String(formData.get("endereco") ?? "").trim() || null, cidade: String(formData.get("cidade") ?? "").trim() || null,
      estado: String(formData.get("estado") ?? "").trim() || null, profissao: String(formData.get("profissao") ?? "").trim() || null,
      renda_declarada: formData.get("renda_declarada") ? Number(formData.get("renda_declarada")) : null,
      relacao_com_cliente: String(formData.get("relacao_com_cliente") ?? "").trim() || null,
    }).select("id").single();
    if (error) throw new Error(error.message);

    revalidatePath("/crediario/fiadores");
    return { success: true, data: { fiadorId: data.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao criar fiador" };
  }
}

export async function analisarFiadorAction(fiadorId: string, resultado: "aprovado" | "reprovado", motivo: string): Promise<ActionResult> {
  try {
    if (!(await temPermissao("analisar"))) return { success: false, error: "Sem permissão pra analisar fiador" };
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from("crediario_fiadores").update({ status_analise: resultado }).eq("id", fiadorId);
    await supabase.from("crediario_fiador_analises").insert({ fiador_id: fiadorId, analisado_por: user?.id ?? null, resultado, motivo });
    await registrarAuditoria("fiador", fiadorId, `analise_${resultado}`, user?.id ?? null, { motivo });

    revalidatePath(`/crediario/fiadores/${fiadorId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao analisar fiador" };
  }
}

/** Nova análise — pedido explícito: vendedor clica "Nova análise", sistema calcula score/classe/limite sozinho. */
export async function criarPropostaCreditoAction(clienteId: string, possuiRestricao: boolean, scoreBureauBruto: number | null): Promise<ActionResult<{ propostaId: string }>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { calcularScoreNeotec, classificarPorScore } = await import("./motor-credito");
    const scoreResult = await calcularScoreNeotec(clienteId, possuiRestricao, scoreBureauBruto);
    const classe = await classificarPorScore(scoreResult.scoreFinal);

    const { data: proposta, error } = await supabase.from("crediario_propostas").insert({
      cliente_id: clienteId, vendedor_id: user?.id ?? null, score_neotec: scoreResult.scoreFinal,
      classe_id: classe?.id ?? null, limite_recomendado: classe?.limite_maximo ?? null, possui_restricao: possuiRestricao,
    }).select("id").single();
    if (error) throw new Error(error.message);

    await supabase.from("crediario_scores").insert({
      proposta_id: proposta.id, score_final: scoreResult.scoreFinal, breakdown: scoreResult.breakdown,
      possui_restricao_bureau: possuiRestricao, fonte_bureau: scoreBureauBruto != null ? "bureau_consultado" : null,
    });

    await registrarAuditoria("proposta", proposta.id, "criada", user?.id ?? null, { score: scoreResult.scoreFinal, classe: classe?.nome });

    revalidatePath("/crediario/propostas");
    return { success: true, data: { propostaId: proposta.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao criar análise" };
  }
}

export async function calcularOfertasAction(propostaId: string, entradaDisponivel: number, frequencia: "diaria" | "semanal" | "quinzenal" | "mensal"): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: proposta } = await supabase.from("crediario_propostas").select("*, classe:crediario_classes(*)").eq("id", propostaId).maybeSingle();
    if (!proposta) return { success: false, error: "Proposta não encontrada" };
    const classe = proposta.classe as unknown as { id: string; nome: string; score_minimo: number; score_maximo: number; limite_maximo: number; entrada_minima_pct: number; prazo_maximo_meses: number; encargos_pct: number; fiador_obrigatorio: boolean; valor_maximo_exposicao: number | null; frequencias_permitidas: string[] } | null;
    if (!classe) return { success: false, error: "Proposta ainda não tem classe definida" };

    const { calcularOfertasDisponiveis } = await import("./motor-credito");
    const ofertas = await calcularOfertasDisponiveis({ classe, entradaDisponivel, frequencia, possuiRestricao: proposta.possui_restricao, exigeFiadorPorRestricao: proposta.possui_restricao });

    await supabase.from("crediario_ofertas").delete().eq("proposta_id", propostaId).eq("frequencia_pagamento", frequencia);
    await supabase.from("crediario_ofertas").insert(ofertas.map((o) => ({
      proposta_id: propostaId, produto_id: o.produtoId, frequencia_pagamento: o.frequencia, valor_entrada: o.valorEntrada,
      numero_pagamentos: o.numeroPagamentos, valor_pagamento: o.valorPagamento, valor_total_contratado: o.valorTotalContratado,
      status: o.status, motivo_indisponivel: o.motivoIndisponivel,
    })));

    revalidatePath(`/crediario/propostas/${propostaId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao calcular ofertas" };
  }
}

export async function selecionarOfertaAction(ofertaId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: oferta } = await supabase.from("crediario_ofertas").select("proposta_id").eq("id", ofertaId).maybeSingle();
    if (!oferta) return { success: false, error: "Oferta não encontrada" };
    await supabase.from("crediario_ofertas").update({ selecionada: false }).eq("proposta_id", oferta.proposta_id);
    await supabase.from("crediario_ofertas").update({ selecionada: true }).eq("id", ofertaId);
    revalidatePath(`/crediario/propostas/${oferta.proposta_id}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao selecionar oferta" };
  }
}

/** Aprovação SEMPRE humana — nunca automática (pedido explícito do documento). Exige permissão específica. */
export async function decidirPropostaAction(propostaId: string, decisao: "aprovado" | "reprovado", motivo: string, limiteConcedido?: number): Promise<ActionResult> {
  try {
    if (!(await temPermissao(decisao === "aprovado" ? "aprovar" : "reprovar"))) {
      return { success: false, error: `Sem permissão pra ${decisao === "aprovado" ? "aprovar" : "reprovar"} crédito` };
    }
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: proposta } = await supabase.from("crediario_propostas").select("score_neotec, classe:crediario_classes(nome)").eq("id", propostaId).maybeSingle();
    const classeNome = (proposta?.classe as unknown as { nome: string } | null)?.nome ?? null;

    await supabase.from("crediario_propostas").update({
      status: decisao === "aprovado" ? "aprovada" : "reprovada", aprovado_por: user?.id ?? null, motivo_decisao: motivo, decidido_em: new Date().toISOString(),
    }).eq("id", propostaId);

    await supabase.from("crediario_decisoes").insert({
      proposta_id: propostaId, decidido_por: user?.id ?? null, decisao, score_no_momento: proposta?.score_neotec ?? null,
      classe_no_momento: classeNome, limite_concedido: limiteConcedido ?? null, motivo,
    });

    await registrarAuditoria("proposta", propostaId, decisao, user?.id ?? null, { motivo });

    revalidatePath(`/crediario/propostas/${propostaId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao decidir proposta" };
  }
}

/**
 * Converte proposta aprovada + oferta selecionada em contrato de
 * verdade — usa o módulo de Contratos já existente (Fase 205), gera
 * as parcelas pelo motor financeiro, e marca o aparelho como em
 * locação. Nunca duplica lógica de contrato.
 */
export async function converterPropostaEmContratoAction(propostaId: string): Promise<ActionResult<{ contratoId: string }>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: proposta } = await supabase.from("crediario_propostas").select("*, classe:crediario_classes(encargos_pct)").eq("id", propostaId).maybeSingle();
    if (!proposta || proposta.status !== "aprovada") return { success: false, error: "Só é possível gerar contrato de uma proposta aprovada" };

    const { data: oferta } = await supabase.from("crediario_ofertas").select("*").eq("proposta_id", propostaId).eq("selecionada", true).maybeSingle();
    if (!oferta) return { success: false, error: "Nenhuma oferta selecionada" };

    const { data: aparelho } = await supabase.from("aparelhos").select("id").eq("produto_id", oferta.produto_id).eq("status", "disponivel").limit(1).maybeSingle();
    if (!aparelho) return { success: false, error: "Nenhum aparelho disponível em estoque pra esse modelo" };

    const dataInicio = new Date().toISOString().slice(0, 10);
    const dataFim = new Date(new Date().setMonth(new Date().getMonth() + Math.ceil(oferta.numero_pagamentos * (oferta.frequencia_pagamento === "mensal" ? 1 : oferta.frequencia_pagamento === "quinzenal" ? 0.5 : oferta.frequencia_pagamento === "semanal" ? 0.25 : 0.033)))).toISOString().slice(0, 10);

    const { criarContratoAction } = await import("@/services/contratos/contrato.actions");
    const resultadoContrato = await criarContratoAction({
      clienteId: proposta.cliente_id, aparelhoId: aparelho.id, temFiador: !!proposta.fiador_id,
      dataInicio, dataFim, valorEntrada: oferta.valor_entrada, frequenciaPagamento: oferta.frequencia_pagamento,
      numeroPagamentos: oferta.numero_pagamentos, valorPagamento: oferta.valor_pagamento,
      temOpcaoAquisicao: true, nivelFormalizacao: "eletronico",
    });
    if (!resultadoContrato.success) return resultadoContrato;

    const contratoId = resultadoContrato.data.contratoId;
    await supabase.from("contratos").update({ proposta_id: propostaId, oferta_id: oferta.id }).eq("id", contratoId);
    await supabase.from("crediario_propostas").update({ status: "convertida_contrato" }).eq("id", propostaId);
    await supabase.from("aparelhos").update({ status: "reservado", status_crediario: "reservado_crediario", contrato_crediario_atual_id: contratoId }).eq("id", aparelho.id);

    // Gera as parcelas pelo motor financeiro — mesmo motor usado na oferta, nunca recalcula diferente.
    const { calcularPlanoCrediario } = await import("./motor-financeiro");
    const plano = calcularPlanoCrediario({
      valorLiquidoDesejado: oferta.valor_pagamento * oferta.numero_pagamentos + oferta.valor_entrada,
      valorEntrada: oferta.valor_entrada, frequencia: oferta.frequencia_pagamento, numeroPagamentos: oferta.numero_pagamentos,
      encargosPct: 0, // encargos já embutidos no valor_pagamento calculado na oferta — nunca aplica 2x
      dataInicio,
    });
    await supabase.from("crediario_parcelas").insert(plano.parcelas.map((p) => ({
      contrato_id: contratoId, numero: p.numero, frequencia: oferta.frequencia_pagamento, valor_original: p.valor, vencimento: p.vencimento,
    })));

    // Atualiza a escada de crédito — cliente ganha um contrato ativo a mais.
    const { data: historicoAtual } = await supabase.from("crediario_cliente_historico").select("contratos_ativos").eq("cliente_id", proposta.cliente_id).maybeSingle();
    await supabase.from("crediario_cliente_historico").upsert({
      cliente_id: proposta.cliente_id, score_atual: proposta.score_neotec, limite_atual: proposta.limite_recomendado ?? 0,
      contratos_ativos: (historicoAtual?.contratos_ativos ?? 0) + 1,
    }, { onConflict: "cliente_id" });

    await registrarAuditoria("proposta", propostaId, "convertida_contrato", user?.id ?? null, { contratoId });

    revalidatePath("/crediario");
    return { success: true, data: { contratoId } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao gerar contrato" };
  }
}

/** Renegociação — SEMPRE humano, exige permissão específica, nunca o bot chega perto disso. */
export async function renegociarParcelaAction(input: {
  contratoId: string; parcelaId?: string; novaData?: string; novoValor?: number;
  entradaRenegociacao?: number; descontoAutorizado?: number; observacao?: string;
}): Promise<ActionResult> {
  try {
    if (!(await temPermissao("renegociar"))) return { success: false, error: "Sem permissão pra renegociar" };
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Sessão expirada" };

    const { error } = await supabase.from("crediario_renegociacoes").insert({
      contrato_id: input.contratoId, parcela_id: input.parcelaId ?? null, nova_data: input.novaData ?? null,
      novo_valor: input.novoValor ?? null, entrada_renegociacao: input.entradaRenegociacao ?? null,
      desconto_autorizado: input.descontoAutorizado ?? null, observacao: input.observacao ?? null, aprovado_por: user.id,
    });
    if (error) throw new Error(error.message);

    if (input.parcelaId && (input.novaData || input.novoValor)) {
      await supabase.from("crediario_parcelas").update({
        status: "negociado", ...(input.novaData ? { vencimento: input.novaData } : {}), ...(input.novoValor ? { valor_original: input.novoValor } : {}),
      }).eq("id", input.parcelaId);
    }

    await registrarAuditoria("contrato", input.contratoId, "renegociado", user.id, input);
    revalidatePath(`/contratos/${input.contratoId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao renegociar" };
  }
}

export async function salvarClasseAction(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const id = String(formData.get("id") ?? "");
    const dados = {
      score_minimo: Number(formData.get("score_minimo")), score_maximo: Number(formData.get("score_maximo")),
      limite_maximo: Number(formData.get("limite_maximo")), entrada_minima_pct: Number(formData.get("entrada_minima_pct")),
      prazo_maximo_meses: Number(formData.get("prazo_maximo_meses")), encargos_pct: Number(formData.get("encargos_pct")),
      fiador_obrigatorio: formData.get("fiador_obrigatorio") === "on",
    };
    if (id) await supabase.from("crediario_classes").update(dados).eq("id", id);
    revalidatePath("/crediario/configuracoes");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar classe" };
  }
}

export async function salvarAparelhoConfigAction(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const produtoId = String(formData.get("produto_id") ?? "").trim();
    if (!produtoId) return { success: false, error: "Informa o ID do produto" };

    const { error } = await supabase.from("crediario_aparelhos_config").upsert({
      produto_id: produtoId, valor_referencia: Number(formData.get("valor_referencia") ?? 0),
      entrada_minima: Number(formData.get("entrada_minima") ?? 0), prazo_maximo_meses: Number(formData.get("prazo_maximo_meses") ?? 12),
      valor_opcao_aquisicao: formData.get("valor_opcao_aquisicao") ? Number(formData.get("valor_opcao_aquisicao")) : null,
    }, { onConflict: "produto_id" });
    if (error) throw new Error(error.message);

    revalidatePath("/crediario/configuracoes");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao configurar aparelho" };
  }
}

export async function salvarConfigWhatsappCobrancaAction(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: existente } = await supabase.from("integracoes_whatsapp_cobranca").select("id").maybeSingle();

    const dados = {
      phone_number_id: String(formData.get("phone_number_id") ?? "").trim() || null,
      access_token: String(formData.get("access_token") ?? "").trim() || null,
      numero: String(formData.get("numero") ?? "").trim() || null,
      dias_para_humano: Number(formData.get("dias_para_humano") ?? 7),
    };

    if (existente) await supabase.from("integracoes_whatsapp_cobranca").update(dados).eq("id", existente.id);
    else await supabase.from("integracoes_whatsapp_cobranca").insert(dados);

    revalidatePath("/crediario/configuracoes");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar" };
  }
}
