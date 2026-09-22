"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import * as service from "./prostec.service";
import type { ActionResult } from "@/types";

export async function atualizarStatusLeadProstecAction(leadId: string, novoStatus: string, motivoPerda?: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: leadAtual } = await supabase.from("prostec_leads").select("status").eq("id", leadId).maybeSingle();

    const { error } = await supabase.from("prostec_leads").update({
      status: novoStatus, motivo_perda: novoStatus === "perdido" ? (motivoPerda ?? null) : null, updated_at: new Date().toISOString(),
    }).eq("id", leadId);
    if (error) throw new Error(error.message);

    await supabase.from("prostec_lead_status_history").insert({
      lead_id: leadId, from_status: leadAtual?.status ?? null, to_status: novoStatus, changed_by: user?.id ?? null,
    });

    await supabase.from("prostec_atividades").insert({
      lead_id: leadId, usuario_id: user?.id ?? null, tipo: "status_mudou",
      descricao: novoStatus === "perdido" ? `Marcado como perdido — ${motivoPerda}` : `Status mudou pra "${novoStatus}"`,
    });

    if (novoStatus === "qualificado") await distribuirLeadAutomaticamente(leadId);

    revalidatePath("/prostec");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao atualizar status" };
  }
}

export async function adicionarNotaLeadAction(leadId: string, nota: string): Promise<ActionResult> {
  if (!nota.trim()) return { success: false, error: "Escreve alguma coisa" };
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("prostec_lead_notes").insert({ lead_id: leadId, user_id: user?.id ?? null, note: nota.trim() });
    if (error) throw new Error(error.message);
    revalidatePath(`/prostec/leads/${leadId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar nota" };
  }
}

export async function registrarContatoLeadAction(leadId: string, contactType: string, result: string, notes: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("prostec_lead_contacts").insert({
      lead_id: leadId, user_id: user?.id ?? null, contact_type: contactType, result, notes: notes.trim() || null,
    });
    if (error) throw new Error(error.message);
    revalidatePath(`/prostec/leads/${leadId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao registrar contato" };
  }
}

export async function agendarFollowupLeadAction(leadId: string, data: string, hora: string, observacao: string): Promise<ActionResult> {
  if (!data) return { success: false, error: "Escolhe uma data" };
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("prostec_lead_followups").insert({
      lead_id: leadId, user_id: user?.id ?? null, next_contact_date: data, next_contact_time: hora || null, observation: observacao.trim() || null,
    });
    if (error) throw new Error(error.message);
    revalidatePath(`/prostec/leads/${leadId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao agendar follow-up" };
  }
}

export async function concluirFollowupLeadAction(followupId: string, leadId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("prostec_lead_followups").update({ done: true }).eq("id", followupId);
    if (error) throw new Error(error.message);
    revalidatePath(`/prostec/leads/${leadId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao concluir follow-up" };
  }
}

export async function salvarConfiguracoesProstecAction(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("prostec_settings").update({
      score_quente_min: Number(formData.get("score_quente_min")),
      score_morno_min: Number(formData.get("score_morno_min")),
      raio_padrao_km: Number(formData.get("raio_padrao_km")),
      quantidade_padrao: Number(formData.get("quantidade_padrao")),
      comissao_pct_padrao: Number(formData.get("comissao_pct_padrao")),
      valor_venda_padrao: Number(formData.get("valor_venda_padrao")),
      segmentos_disponiveis: String(formData.get("segmentos_disponiveis") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
      cidades_sugeridas: String(formData.get("cidades_sugeridas") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
      updated_at: new Date().toISOString(),
    }).eq("id", "default");
    if (error) throw new Error(error.message);
    revalidatePath("/prostec/configuracoes");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar configurações" };
  }
}
export async function registrarVendaProstecAction(leadId: string, product: string, amount: number, comissaoPct: number): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Sessão expirada" };

    const { data: venda, error: erroVenda } = await supabase
      .from("prostec_sales")
      .insert({ lead_id: leadId, user_id: user.id, product, amount })
      .select("id")
      .single();
    if (erroVenda) throw new Error(erroVenda.message);

    const valorComissao = Math.round(amount * (comissaoPct / 100) * 100) / 100;
    await supabase.from("prostec_commissions").insert({ sale_id: venda.id, user_id: user.id, pct: comissaoPct, amount: valorComissao });

    await supabase.from("prostec_leads").update({ status: "venda_fechada" }).eq("id", leadId);

    await supabase.from("prostec_atividades").insert({
      lead_id: leadId, usuario_id: user.id, tipo: "venda", descricao: `💰 Venda fechada — ${product} (${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amount)})`,
    });

    revalidatePath("/prostec");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao registrar venda" };
  }
}

/** Cadastro manual de empresa (a busca automática ainda não está construída, só o schema pra ela). Já cria com um lead na etapa "novo" junto. */
export async function cadastrarEmpresaManualAction(formData: FormData): Promise<ActionResult<{ leadId: string }>> {
  const nome = String(formData.get("name") ?? "").trim();
  const cidade = String(formData.get("city") ?? "").trim();
  if (!nome) return { success: false, error: "Informe o nome da empresa" };
  if (!cidade) return { success: false, error: "Informe a cidade" };

  try {
    const supabase = await createClient();

    const { data: empresa, error: erroEmpresa } = await supabase
      .from("prostec_companies")
      .insert({
        name: nome,
        category: String(formData.get("category") ?? "") || "outro",
        city: cidade,
        state: String(formData.get("state") ?? "") || "MG",
        phone: String(formData.get("phone") ?? "") || null,
        whatsapp: String(formData.get("whatsapp") ?? "") || null,
        website: String(formData.get("website") ?? "") || null,
        instagram: String(formData.get("instagram") ?? "") || null,
        source: "cadastro_manual",
        dedupe_key: `manual-${nome.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
      })
      .select("id")
      .single();
    if (erroEmpresa) throw new Error(erroEmpresa.message);

    const { data: lead, error: erroLead } = await supabase
      .from("prostec_leads")
      .insert({
        company_id: empresa.id,
        segment: String(formData.get("category") ?? "") || "outro",
        score: 0,
        temperature: "frio",
        status: "novo",
        approach_suggestion: "Cadastrado manualmente — sem sugestão automática de abordagem.",
      })
      .select("id")
      .single();
    if (erroLead) throw new Error(erroLead.message);

    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("prostec_atividades").insert({
      lead_id: lead.id, usuario_id: user?.id ?? null, tipo: "lead_criado", descricao: `Lead cadastrado manualmente — ${nome}`,
    });

    revalidatePath("/prostec/empresas");
    revalidatePath("/prostec");
    return { success: true, data: { leadId: lead.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao cadastrar empresa" };
  }
}

// Fase 229: a busca síncrona via Google Places API (executarBuscaProstecAction)
// foi removida — a captação de leads agora é 100% via scraper próprio do
// Google Maps (fila assíncrona, ver src/services/prostec/scraper/). Empresas
// cadastradas pela busca antiga continuam no banco, marcadas com
// origem = 'places_api_legado' (ver migration fase229).

export async function definirMetaVendedorAction(usuarioId: string, valorMeta: number): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const mesRef = new Date();
    mesRef.setDate(1);
    const { error } = await supabase.from("prostec_metas").upsert(
      { usuario_id: usuarioId, mes: mesRef.toISOString().slice(0, 10), valor_meta: valorMeta },
      { onConflict: "usuario_id,mes" }
    );
    if (error) throw new Error(error.message);
    revalidatePath("/prostec/ranking");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao definir meta" };
  }
}

export async function criarPropostaProstecAction(leadId: string, produto: string, valor: number, formaPagamento: string, valorManutencaoMensal?: number): Promise<ActionResult<{ token: string }>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: proposta, error } = await supabase.from("prostec_propostas").insert({
      lead_id: leadId, criado_por: user?.id ?? null, produto, valor, forma_pagamento: formaPagamento || null,
      valor_manutencao_mensal: valorManutencaoMensal && valorManutencaoMensal > 0 ? valorManutencaoMensal : null,
    }).select("token_publico").single();
    if (error) throw new Error(error.message);

    await supabase.from("prostec_leads").update({ status: "proposta_enviada" }).eq("id", leadId);
    await supabase.from("prostec_atividades").insert({
      lead_id: leadId, usuario_id: user?.id ?? null, tipo: "proposta_enviada", descricao: `📄 Proposta enviada — ${produto}`,
    });

    revalidatePath(`/prostec/leads/${leadId}`);
    revalidatePath("/prostec");
    return { success: true, data: { token: proposta.token_publico } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao criar proposta" };
  }
}

/** Chamado pela página pública da proposta — sem login, o cliente clica aceitar/recusar. */
export async function responderPropostaPublicaAction(token: string, resposta: "aceita" | "recusada"): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: proposta } = await supabase.from("prostec_propostas").select("id, lead_id, produto").eq("token_publico", token).maybeSingle();
    if (!proposta) return { success: false, error: "Proposta não encontrada" };

    await supabase.from("prostec_propostas").update({ status: resposta, respondida_em: new Date().toISOString() }).eq("id", proposta.id);

    if (resposta === "aceita") {
      await supabase.from("prostec_leads").update({ status: "negociacao" }).eq("id", proposta.lead_id);
    }

    await supabase.from("prostec_atividades").insert({
      lead_id: proposta.lead_id, tipo: "proposta_visualizada",
      descricao: resposta === "aceita" ? `✅ Cliente aceitou a proposta — ${proposta.produto}` : `❌ Cliente recusou a proposta — ${proposta.produto}`,
    });

    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao registrar resposta" };
  }
}

export async function iniciarBotProstecAction(leadId: string, telefone: string, nomeEmpresa: string): Promise<ActionResult> {
  try {
    const { iniciarConversaBot } = await import("./whatsapp/prostec-bot.service");
    const resultado = await iniciarConversaBot(leadId, telefone, nomeEmpresa);
    if (!resultado.sucesso) return { success: false, error: resultado.motivo ?? "Erro ao iniciar bot" };
    revalidatePath("/prostec/inbox");
    revalidatePath(`/prostec/leads/${leadId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao iniciar bot" };
  }
}

export async function assumirConversaProstecAction(conversaId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Sessão expirada" };

    const { assumirConversaProstec } = await import("./whatsapp/prostec-bot.service");
    await assumirConversaProstec(conversaId, user.id);
    revalidatePath("/prostec/inbox");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao assumir conversa" };
  }
}

export async function enviarMensagemManualProstecAction(conversaId: string, telefone: string, texto: string): Promise<ActionResult> {
  if (!texto.trim()) return { success: false, error: "Escreve alguma coisa" };
  try {
    const { enviarMensagemProstec } = await import("./whatsapp/prostec-whatsapp.provider");
    const resultado = await enviarMensagemProstec(telefone, texto);
    if (!resultado.enviado) return { success: false, error: resultado.motivo ?? "Não foi possível enviar" };

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("prostec_mensagens").insert({ conversa_id: conversaId, remetente: "vendedor", conteudo: texto });
    await supabase.from("prostec_conversas").update({
      ultima_mensagem_em: new Date().toISOString(), nao_lidas: 0, propriedade: "human", responsavel_id: user?.id ?? null,
    }).eq("id", conversaId);

    revalidatePath("/prostec/inbox");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao enviar mensagem" };
  }
}

export async function marcarConversaLidaProstecAction(conversaId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    await supabase.from("prostec_conversas").update({ nao_lidas: 0 }).eq("id", conversaId);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro" };
  }
}

export async function conectarWhatsappProstecAction(): Promise<ActionResult> {
  try {
    const { conectarWhatsappProstec } = await import("./whatsapp/prostec-whatsapp.provider");
    const resultado = await conectarWhatsappProstec();
    if (!resultado.ok) return { success: false, error: resultado.erro ?? "Não foi possível conectar" };
    revalidatePath("/prostec/configuracoes");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao conectar" };
  }
}

export async function desconectarWhatsappProstecAction(): Promise<ActionResult> {
  try {
    const { desconectarWhatsappProstec } = await import("./whatsapp/prostec-whatsapp.provider");
    const resultado = await desconectarWhatsappProstec();
    if (!resultado.ok) return { success: false, error: resultado.erro ?? "Não foi possível desconectar" };
    revalidatePath("/prostec/configuracoes");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao desconectar" };
  }
}

export async function definirModoOperacaoProstecAction(modo: "teste" | "piloto" | "autonomo"): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: linha } = await supabase.from("integracoes_whatsapp_prostec").select("id").maybeSingle();
    if (!linha) return { success: false, error: "Configuração não encontrada" };
    await supabase.from("integracoes_whatsapp_prostec").update({ modo_operacao: modo }).eq("id", linha.id);
    revalidatePath("/prostec/configuracoes");
    revalidatePath("/prostec/configuracoes");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao definir modo" };
  }
}

export async function pausarOuAtivarIaraAction(ativa: boolean): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: linha } = await supabase.from("integracoes_whatsapp_prostec").select("id").maybeSingle();
    if (!linha) return { success: false, error: "Configuração não encontrada" };
    await supabase.from("integracoes_whatsapp_prostec").update({
      iara_ativa: ativa,
      ...(ativa ? { pausado_automaticamente: false, motivo_pausa_automatica: null } : {}),
    }).eq("id", linha.id);
    revalidatePath("/prostec/configuracoes");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao atualizar" };
  }
}

export async function devolverConversaParaIaraAction(conversaId: string): Promise<ActionResult> {
  try {
    const { devolverConversaParaIara } = await import("./whatsapp/prostec-bot.service");
    await devolverConversaParaIara(conversaId);
    revalidatePath("/prostec/inbox");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao devolver conversa" };
  }
}

export async function listarConversasProstecAction(): Promise<ActionResult<Awaited<ReturnType<typeof service.listarConversasProstec>>>> {
  try {
    const dados = await service.listarConversasProstec();
    return { success: true, data: dados };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao carregar conversas" };
  }
}

export async function buscarConversaComMensagensAction(conversaId: string): Promise<ActionResult<NonNullable<Awaited<ReturnType<typeof service.buscarConversaComMensagens>>>>> {
  try {
    const dados = await service.buscarConversaComMensagens(conversaId);
    if (!dados) return { success: false, error: "Conversa não encontrada" };
    return { success: true, data: dados };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao carregar conversa" };
  }
}

/**
 * Salva o catálogo inteiro de produtos da Prostec de uma vez (Fase
 * 223) — substitui a antiga salvarOfertaProstecAction (só um produto).
 * O form manda um campo "produtos[]" com a lista de slugs presentes e,
 * pra cada slug, campos "<slug>__campo" — assim um único submit
 * atualiza todos os produtos editados na tela.
 */
export async function salvarProdutosProstecAction(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const slugs = formData.getAll("produtos[]").map(String);
    if (slugs.length === 0) return { success: false, error: "Nenhum produto encontrado no formulário" };

    for (const slug of slugs) {
      const campo = (nome: string) => formData.get(`${slug}__${nome}`);
      const { error } = await supabase.from("prostec_produtos").update({
        nome: String(campo("nome") ?? "").trim(),
        descricao_curta: String(campo("descricao_curta") ?? "").trim(),
        quando_recomendar: String(campo("quando_recomendar") ?? "").trim(),
        preco: Number(campo("preco") ?? 0),
        tipo_cobranca: campo("tipo_cobranca") === "mensal" ? "mensal" : "unico",
        valor_manutencao_mensal: Number(campo("valor_manutencao_mensal") ?? 0),
        formas_pagamento: String(campo("formas_pagamento") ?? "").trim(),
        prazo_entrega: String(campo("prazo_entrega") ?? "").trim(),
        incluso: String(campo("incluso") ?? "").trim(),
        nao_incluso: String(campo("nao_incluso") ?? "").trim(),
        desconto_maximo_automatico_pct: Number(campo("desconto_maximo_automatico_pct") ?? 0),
        parcelamento_maximo: Number(campo("parcelamento_maximo") ?? 1),
        ativo: campo("ativo") === "on",
      }).eq("id", slug);
      if (error) throw new Error(error.message);
    }

    revalidatePath("/prostec/configuracoes");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar produtos" };
  }
}

/** Liga/desliga o início automático do bot depois de uma busca de prospecção, e ajusta a trava de quantidade máxima por execução. */
export async function salvarAutoInicioBotProstecAction(auto: boolean, limite: number): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: linha } = await supabase.from("integracoes_whatsapp_prostec").select("id").maybeSingle();
    if (!linha) return { success: false, error: "Configuração não encontrada" };
    await supabase.from("integracoes_whatsapp_prostec").update({
      auto_iniciar_bot_apos_busca: auto,
      limite_auto_inicio_por_busca: Number.isFinite(limite) && limite > 0 ? Math.floor(limite) : 15,
    }).eq("id", linha.id);
    revalidatePath("/prostec/configuracoes");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar configuração" };
  }
}

export async function atribuirLeadVendedorAction(leadId: string, usuarioId: string | null): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("prostec_leads").update({ assigned_to: usuarioId }).eq("id", leadId);
    if (error) throw new Error(error.message);

    if (usuarioId) {
      const { data: vendedor } = await supabase.from("usuarios").select("nome").eq("id", usuarioId).maybeSingle();
      await supabase.from("prostec_atividades").insert({ lead_id: leadId, tipo: "atribuicao", descricao: `Atribuído pra ${vendedor?.nome ?? "vendedor"}` });
    }

    revalidatePath(`/prostec/leads/${leadId}`);
    revalidatePath("/prostec");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao atribuir lead" };
  }
}

/**
 * Distribuição automática (round robin simples) — chamada quando um
 * lead vira "qualificado" sem já ter alguém atribuído. Pega o
 * vendedor_prostec que está com MENOS leads atribuídos no momento —
 * isso já distribui de forma equilibrada com o tempo, sem precisar
 * guardar "de quem foi a vez" em lugar nenhum.
 */
export async function distribuirLeadAutomaticamente(leadId: string): Promise<void> {
  const supabase = await createClient();

  const { data: leadAtual } = await supabase.from("prostec_leads").select("assigned_to").eq("id", leadId).maybeSingle();
  if (leadAtual?.assigned_to) return; // já tem alguém, não sobrescreve escolha manual

  const { data: vendedores } = await supabase.from("usuarios").select("id").eq("cargo", "vendedor_prostec");
  if (!vendedores || vendedores.length === 0) return; // sem vendedor cadastrado, fica sem atribuir mesmo

  const contagens = await Promise.all(
    vendedores.map(async (v) => {
      const { count } = await supabase.from("prostec_leads").select("*", { count: "exact", head: true }).eq("assigned_to", v.id).not("status", "in", "(venda_fechada,perdido)");
      return { usuarioId: v.id, quantidade: count ?? 0 };
    })
  );

  const escolhido = contagens.sort((a, b) => a.quantidade - b.quantidade)[0];
  await supabase.from("prostec_leads").update({ assigned_to: escolhido.usuarioId }).eq("id", leadId);

  const { data: vendedor } = await supabase.from("usuarios").select("nome").eq("id", escolhido.usuarioId).maybeSingle();
  await supabase.from("prostec_atividades").insert({ lead_id: leadId, tipo: "atribuicao", descricao: `🎯 Atribuído automaticamente pra ${vendedor?.nome ?? "vendedor"} (distribuição por carga)` });
}

export async function criarExperimentoProstecAction(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const nome = String(formData.get("nome") ?? "").trim();
    const textoA = String(formData.get("texto_a") ?? "").trim();
    const textoB = String(formData.get("texto_b") ?? "").trim();
    const amostraMinima = Number(formData.get("amostra_minima") ?? 30);
    if (!nome || !textoA || !textoB) return { success: false, error: "Preenche nome e as duas mensagens" };

    const { data: experimento, error } = await supabase.from("prostec_experimentos").insert({ nome, amostra_minima: amostraMinima, status: "ativo" }).select("id").single();
    if (error) throw new Error(error.message);

    await supabase.from("prostec_experimento_variantes").insert([
      { experimento_id: experimento.id, nome: "A", texto_mensagem: textoA },
      { experimento_id: experimento.id, nome: "B", texto_mensagem: textoB },
    ]);

    revalidatePath("/prostec/experimentos");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao criar experimento" };
  }
}

export async function encerrarExperimentoProstecAction(experimentoId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: variantes } = await supabase.from("prostec_experimento_variantes").select("nome, enviadas, vendidas").eq("experimento_id", experimentoId);

    // Nunca declara vencedor com amostra insuficiente — pedido explícito do documento.
    const { data: experimento } = await supabase.from("prostec_experimentos").select("amostra_minima").eq("id", experimentoId).maybeSingle();
    const totalEnviadas = (variantes ?? []).reduce((acc, v) => acc + v.enviadas, 0);

    let vencedora: string | null = null;
    if (totalEnviadas >= (experimento?.amostra_minima ?? 30)) {
      const melhor = (variantes ?? []).sort((a, b) => (b.vendidas / Math.max(b.enviadas, 1)) - (a.vendidas / Math.max(a.enviadas, 1)))[0];
      vencedora = melhor?.nome ?? null;
    }

    await supabase.from("prostec_experimentos").update({ status: "concluido", variante_vencedora: vencedora, encerrado_em: new Date().toISOString() }).eq("id", experimentoId);
    revalidatePath("/prostec/experimentos");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao encerrar experimento" };
  }
}
