"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/types";

const BUCKET_CONTRATOS = "contratos";

async function registrarEvento(contratoId: string, tipo: string, usuarioId: string | null, observacao?: string) {
  const supabase = await createClient();
  await supabase.from("contratos_eventos").insert({ contrato_id: contratoId, tipo, usuario_id: usuarioId, observacao: observacao ?? null });
}

export interface CriarContratoInput {
  clienteId: string; aparelhoId: string; temFiador: boolean;
  fiadorNome?: string; fiadorCpf?: string; fiadorEndereco?: string; fiadorCidade?: string; fiadorEstado?: string;
  dataInicio: string; dataFim: string; valorEntrada?: number; frequenciaPagamento?: string; numeroPagamentos?: number; valorPagamento?: number;
  temOpcaoAquisicao: boolean; valorOpcaoAquisicao?: number; nivelFormalizacao: string;
}

export async function criarContratoAction(input: CriarContratoInput): Promise<ActionResult<{ contratoId: string }>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Sessão expirada" };

    const { buscarModeloAtivo, montarDadosParaTemplate, renderizarContrato, encontrarPlaceholdersNaoResolvidos, gerarPdfContrato } = await import("./contrato.service");

    const modelo = await buscarModeloAtivo();
    if (!modelo) return { success: false, error: "Nenhum modelo de contrato ativo — configura um em Contratos → Modelos." };

    const { dados, erro } = await montarDadosParaTemplate(input);
    if (erro) return { success: false, error: erro };

    const { data: numeroGerado } = await supabase.rpc("gerar_numero_contrato");
    const numero = numeroGerado as string;
    dados.numeroContrato = numero;

    const conteudoFinal = renderizarContrato(modelo.conteudo, dados);
    const pendentes = encontrarPlaceholdersNaoResolvidos(conteudoFinal);
    if (pendentes.length > 0) return { success: false, error: `O modelo ficou com campo(s) sem preencher: ${pendentes.join(", ")} — confere os dados antes de gerar.` };

    const { data: contrato, error: erroContrato } = await supabase.from("contratos").insert({
      numero, modelo_id: modelo.id, cliente_id: input.clienteId, aparelho_id: input.aparelhoId,
      nivel_formalizacao: input.nivelFormalizacao, status: "rascunho",
      valor_entrada: input.valorEntrada ?? null, frequencia_pagamento: input.frequenciaPagamento ?? null,
      numero_pagamentos: input.numeroPagamentos ?? null, valor_pagamento: input.valorPagamento ?? null,
      data_inicio: input.dataInicio, data_fim: input.dataFim,
      tem_opcao_aquisicao: input.temOpcaoAquisicao, valor_opcao_aquisicao: input.valorOpcaoAquisicao ?? null,
      conteudo_final: conteudoFinal, criado_por: user.id,
    }).select("id").single();
    if (erroContrato) throw new Error(erroContrato.message);

    // Signatários — sempre Neotec + cliente, fiador só se aplicável.
    const signatarios: { contrato_id: string; papel: "neotec" | "cliente" | "fiador"; nome: string; cpf: string }[] = [
      { contrato_id: contrato.id, papel: "neotec", nome: dados.neotecRazaoSocial, cpf: "—" },
      { contrato_id: contrato.id, papel: "cliente", nome: dados.clienteNome, cpf: dados.clienteCpf },
    ];
    if (input.temFiador && input.fiadorNome && input.fiadorCpf) {
      signatarios.push({ contrato_id: contrato.id, papel: "fiador", nome: input.fiadorNome, cpf: input.fiadorCpf });
    }
    await supabase.from("contratos_signatarios").insert(signatarios);

    // Gera o PDF (rascunho) e já anexa como documento principal.
    const pdfBuffer = await gerarPdfContrato({ numeroContrato: numero, textoRenderizado: conteudoFinal, modeloRevisadoJuridicamente: modelo.revisado_juridicamente });
    const caminho = `${contrato.id}/contrato-rascunho.pdf`;
    const admin = createAdminClient();
    await admin.storage.from(BUCKET_CONTRATOS).upload(caminho, pdfBuffer, { contentType: "application/pdf", upsert: true });
    await supabase.from("contratos").update({ pdf_url: caminho }).eq("id", contrato.id);
    await supabase.from("contratos_documentos").insert({ contrato_id: contrato.id, tipo: "contrato_principal", url: caminho, descricao: `Contrato ${numero} (rascunho)`, created_by: user.id });

    await registrarEvento(contrato.id, "criado", user.id, `Contrato ${numero} gerado a partir do modelo "${modelo.nome}" (${modelo.versao})`);

    revalidatePath("/contratos");
    return { success: true, data: { contratoId: contrato.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao criar contrato" };
  }
}

/** Move o contrato de rascunho pra aguardando assinatura — só um "sinalizador" com o provider manual, já que não tem provedor real conectado ainda. */
export async function enviarParaAssinaturaAction(contratoId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: contrato } = await supabase.from("contratos").select("status").eq("id", contratoId).maybeSingle();
    if (!contrato) return { success: false, error: "Contrato não encontrado" };
    if (contrato.status !== "rascunho" && contrato.status !== "em_revisao") return { success: false, error: "Só é possível enviar pra assinatura um contrato em rascunho ou revisão." };

    await supabase.from("contratos").update({ status: "aguardando_assinatura" }).eq("id", contratoId);
    await supabase.from("contratos_signatarios").update({ status: "enviado" }).eq("contrato_id", contratoId);
    await registrarEvento(contratoId, "enviado", user?.id ?? null, "Contrato enviado pra assinatura (sem provedor eletrônico conectado — colher assinatura manual/presencial)");

    revalidatePath(`/contratos/${contratoId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao enviar pra assinatura" };
  }
}

/**
 * Chamada DEPOIS que o componente CapturaAssinatura já existente
 * salvou a imagem (via salvarAssinaturaAction) — essa action só cuida
 * da parte específica do contrato: status do signatário e verificação
 * se todos já assinaram (vira imutável quando sim).
 */
export async function confirmarAssinaturaRegistradaAction(input: { contratoId: string; signatarioId: string; papel: string }): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: contrato } = await supabase.from("contratos").select("status").eq("id", input.contratoId).maybeSingle();
    if (!contrato) return { success: false, error: "Contrato não encontrado" };
    if (["assinado", "ativo", "encerrado", "cancelado"].includes(contrato.status)) {
      return { success: false, error: "Esse contrato já está assinado/encerrado — documento imutável." };
    }

    await supabase.from("contratos_signatarios").update({ status: "assinado", data_hora_assinatura: new Date().toISOString(), metodo_assinatura: "canvas_presencial" }).eq("id", input.signatarioId);
    await registrarEvento(input.contratoId, "assinado", user?.id ?? null, `Assinatura de ${input.papel} registrada`);

    const { data: signatarios } = await supabase.from("contratos_signatarios").select("status").eq("contrato_id", input.contratoId);
    const todosAssinaram = (signatarios ?? []).every((s) => s.status === "assinado");

    if (todosAssinaram) {
      await supabase.from("contratos").update({ status: "assinado", assinado_em: new Date().toISOString() }).eq("id", input.contratoId);
      await supabase.from("contratos_documentos").update({ imutavel: true }).eq("contrato_id", input.contratoId).eq("tipo", "contrato_principal");
      await registrarEvento(input.contratoId, "assinado", user?.id ?? null, "Todos os signatários assinaram — contrato concluído e imutável");
    } else {
      await supabase.from("contratos").update({ status: "assinatura_parcial" }).eq("id", input.contratoId);
    }

    revalidatePath(`/contratos/${input.contratoId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao confirmar assinatura" };
  }
}

export async function recusarAssinaturaAction(contratoId: string, signatarioId: string, motivo: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("contratos_signatarios").update({ status: "recusado" }).eq("id", signatarioId);
    await supabase.from("contratos").update({ status: "cancelado" }).eq("id", contratoId);
    await registrarEvento(contratoId, "recusado", user?.id ?? null, motivo);
    revalidatePath(`/contratos/${contratoId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao registrar recusa" };
  }
}

export async function cancelarContratoAction(contratoId: string, motivo: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: contrato } = await supabase.from("contratos").select("status").eq("id", contratoId).maybeSingle();
    if (contrato?.status === "assinado" || contrato?.status === "ativo") {
      return { success: false, error: "Contrato já assinado não pode ser cancelado diretamente — use rescisão ou crie um aditivo." };
    }
    await supabase.from("contratos").update({ status: "cancelado" }).eq("id", contratoId);
    await registrarEvento(contratoId, "cancelado", user?.id ?? null, motivo);
    revalidatePath(`/contratos/${contratoId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao cancelar" };
  }
}

/** Aditivo — nunca sobrescreve o contrato original, sempre um registro novo. */
export async function criarAditivoAction(contratoId: string, motivo: string, conteudo: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { count } = await supabase.from("contratos_aditivos").select("*", { count: "exact", head: true }).eq("contrato_id", contratoId);
    const numeroAditivo = (count ?? 0) + 1;

    const { error } = await supabase.from("contratos_aditivos").insert({ contrato_id: contratoId, numero_aditivo: numeroAditivo, motivo, conteudo, created_by: user?.id ?? null });
    if (error) throw new Error(error.message);

    await registrarEvento(contratoId, "substituido", user?.id ?? null, `Aditivo ${numeroAditivo} criado — ${motivo}`);
    revalidatePath(`/contratos/${contratoId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao criar aditivo" };
  }
}

export async function gerarTermoEntregaAction(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const contratoId = String(formData.get("contrato_id"));

    const { data: contrato } = await supabase.from("contratos").select("status").eq("id", contratoId).maybeSingle();
    if (contrato?.status !== "assinado" && contrato?.status !== "ativo") {
      return { success: false, error: "Só é possível registrar entrega depois do contrato assinado." };
    }

    const { error } = await supabase.from("contratos_termos_entrega").insert({
      contrato_id: contratoId, local: String(formData.get("local") ?? "").trim() || null,
      responsavel_id: user?.id ?? null, estado_conservacao: String(formData.get("estado_conservacao") ?? "").trim() || null,
      saude_bateria: formData.get("saude_bateria") ? Number(formData.get("saude_bateria")) : null,
      observacoes: String(formData.get("observacoes") ?? "").trim() || null,
      assinatura_cliente_confirmada: formData.get("confirmado") === "on",
    });
    if (error) throw new Error(error.message);

    await supabase.from("contratos").update({ status: "ativo" }).eq("id", contratoId);
    await registrarEvento(contratoId, "criado", user?.id ?? null, "Termo de entrega registrado — contrato ativo");
    revalidatePath(`/contratos/${contratoId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao registrar entrega" };
  }
}

export async function gerarTermoDevolucaoAction(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const contratoId = String(formData.get("contrato_id"));

    const { error } = await supabase.from("contratos_termos_devolucao").insert({
      contrato_id: contratoId, responsavel_id: user?.id ?? null,
      estado_aparelho: String(formData.get("estado_aparelho") ?? "").trim() || null,
      saude_bateria: formData.get("saude_bateria") ? Number(formData.get("saude_bateria")) : null,
      danos_encontrados: String(formData.get("danos_encontrados") ?? "").trim() || null,
      observacoes: String(formData.get("observacoes") ?? "").trim() || null,
    });
    if (error) throw new Error(error.message);

    await supabase.from("contratos").update({ status: "encerrado", encerrado_em: new Date().toISOString() }).eq("id", contratoId);
    await registrarEvento(contratoId, "devolvido", user?.id ?? null, "Aparelho devolvido — contrato encerrado");
    revalidatePath(`/contratos/${contratoId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao registrar devolução" };
  }
}

export async function exercerOpcaoAquisicaoAction(contratoId: string, valorPago: number, formaPagamento: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: contrato } = await supabase.from("contratos").select("tem_opcao_aquisicao, status").eq("id", contratoId).maybeSingle();
    if (!contrato?.tem_opcao_aquisicao) return { success: false, error: "Esse contrato não tem opção de aquisição prevista." };

    const { error } = await supabase.from("contratos_termos_aquisicao").insert({ contrato_id: contratoId, valor_pago: valorPago, forma_pagamento: formaPagamento, created_by: user?.id ?? null });
    if (error) throw new Error(error.message);

    await supabase.from("contratos").update({ status: "encerrado", encerrado_em: new Date().toISOString() }).eq("id", contratoId);
    await registrarEvento(contratoId, "adquirido", user?.id ?? null, `Opção de aquisição exercida — ${formaPagamento}`);
    revalidatePath(`/contratos/${contratoId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao registrar aquisição" };
  }
}

export async function salvarModeloContratoAction(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const nome = String(formData.get("nome") ?? "").trim();
    const versao = String(formData.get("versao") ?? "").trim();
    const conteudo = String(formData.get("conteudo") ?? "");
    const revisadoJuridicamente = formData.get("revisado_juridicamente") === "on";
    if (!nome || !versao || !conteudo) return { success: false, error: "Preenche nome, versão e conteúdo" };

    // Novo modelo vira o ativo, o(s) anterior(es) deixa(m) de ser — mas
    // NUNCA apaga um modelo antigo, contratos já gerados continuam
    // apontando pra versão que usaram (pedido explícito: versão
    // congelada nunca muda depois de usada).
    await supabase.from("contratos_modelos").update({ ativo: false }).eq("ativo", true);
    const { error } = await supabase.from("contratos_modelos").insert({ nome, versao, conteudo, revisado_juridicamente, ativo: true, created_by: user?.id ?? null });
    if (error) throw new Error(error.message);

    revalidatePath("/contratos/modelos");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar modelo" };
  }
}
