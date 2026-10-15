import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { enviarMensagem, exigirEnvioConfirmado } from "@/services/whatsapp/whatsapp.service";
import { avaliarEnvioAutomatico, janelaDaConfig, proximoHorarioPermitido, modoDoBot, type ConfigBotLinha } from "@/services/whatsapp/trava-envio";
import { gerarSugestao, resultadoDoAcompanhamento, type ContextoConversa, type MensagemResumo, type SugestaoAnterior } from "./sugestoes-comerciais";

export interface SugestaoComercial {
  id: string;
  conversa_id: string;
  card_id: string | null;
  cliente_id: string | null;
  responsavel_id: string | null;
  tipo: string;
  motivo: string;
  mensagem_sugerida: string | null;
  mensagem_final: string | null;
  prioridade: 1 | 2 | 3;
  horario_recomendado: string;
  status: "sugerida" | "enviada" | "adiada" | "descartada" | "vencida";
  adiada_ate: string | null;
  resultado: "respondeu" | "sem_resposta" | "fechou" | "perdido" | null;
  resultado_obs: string | null;
  criado_em: string;
  enviada_em: string | null;
  cliente_nome: string | null;
  telefone: string | null;
}

const DIAS = 24 * 3_600_000;

/**
 * Cron (service role): varre as conversas abertas dos últimos 14 dias, gera no máximo UMA
 * sugestão por conversa e atualiza o resultado das já enviadas. NÃO envia nada ao cliente.
 */
export async function gerarSugestoesComerciais(agora = new Date()): Promise<{ analisadas: number; criadas: number; vencidas: number; resultados: number; erro?: string }> {
  const supabase = createAdminClient();

  const { data: configs } = await supabase.from("configuracoes_bot").select("*");
  const configPorLoja = new Map<string, ConfigBotLinha>((configs ?? []).map((c: ConfigBotLinha & { loja_id: string }) => [c.loja_id, c]));

  const desde = new Date(agora.getTime() - 14 * DIAS).toISOString();
  const { data: conversas, error: erroConversas } = await supabase
    .from("whatsapp_conversas")
    .select("*, cliente:clientes(nome, temperatura), card:crm_cards(perdido)")
    .eq("status", "aberta")
    .gte("ultima_mensagem_em", desde)
    .order("ultima_mensagem_em", { ascending: false })
    .limit(500);
  if (erroConversas) return { analisadas: 0, criadas: 0, vencidas: 0, resultados: 0, erro: erroConversas.message };

  const lista = (conversas ?? []) as unknown as {
    id: string; loja_id: string; cliente_id: string | null; card_id: string | null; responsavel_id: string | null; ia_pausada: boolean;
    nao_contatar?: boolean; cliente: { nome: string | null; temperatura: string | null } | null; card: { perdido: boolean | null } | null;
  }[];
  const ids = lista.map((c) => c.id);

  const mensagensPorConversa = new Map<string, MensagemResumo[]>();
  const sugestoesPorConversa = new Map<string, SugestaoAnterior[]>();
  const trintaDias = new Date(agora.getTime() - 30 * DIAS).toISOString();

  for (let i = 0; i < ids.length; i += 100) {
    const lote = ids.slice(i, i + 100);
    const { data: msgs } = await supabase.from("whatsapp_mensagens").select("conversa_id, direcao, conteudo, criado_em").in("conversa_id", lote).gte("criado_em", trintaDias).order("criado_em", { ascending: false }).limit(5000);
    for (const m of msgs ?? []) {
      const arr = mensagensPorConversa.get(m.conversa_id) ?? [];
      if (arr.length < 12) arr.push({ direcao: m.direcao, conteudo: m.conteudo, criadoEm: m.criado_em });
      mensagensPorConversa.set(m.conversa_id, arr);
    }
    const { data: sugs, error: erroSug } = await supabase.from("sugestoes_comerciais").select("conversa_id, tipo, status, criado_em, adiada_ate").in("conversa_id", lote).gte("criado_em", trintaDias);
    if (erroSug) return { analisadas: 0, criadas: 0, vencidas: 0, resultados: 0, erro: `sugestoes_comerciais indisponível (migration fase266 aplicada?): ${erroSug.message}` };
    for (const s of sugs ?? []) {
      const arr = sugestoesPorConversa.get(s.conversa_id) ?? [];
      arr.push({ tipo: s.tipo, status: s.status, criadoEm: s.criado_em, adiadaAte: s.adiada_ate });
      sugestoesPorConversa.set(s.conversa_id, arr);
    }
  }

  const novas: Record<string, unknown>[] = [];
  for (const c of lista) {
    const janela = janelaDaConfig(configPorLoja.get(c.loja_id));
    const contexto: ContextoConversa = {
      conversaId: c.id, cardId: c.card_id, clienteId: c.cliente_id, responsavelId: c.responsavel_id,
      clienteNome: c.cliente?.nome ?? null, naoContatar: c.nao_contatar === true, iaPausada: c.ia_pausada,
      cardPerdido: c.card?.perdido === true, temperatura: c.cliente?.temperatura ?? null,
      mensagens: mensagensPorConversa.get(c.id) ?? [], sugestoesAnteriores: sugestoesPorConversa.get(c.id) ?? [],
    };
    const s = gerarSugestao(contexto, agora, janela);
    if (!s) continue;
    novas.push({
      loja_id: c.loja_id, conversa_id: s.conversaId, card_id: s.cardId, cliente_id: s.clienteId, responsavel_id: s.responsavelId,
      tipo: s.tipo, motivo: s.motivo, mensagem_sugerida: s.mensagemSugerida, prioridade: s.prioridade,
      horario_recomendado: s.horarioRecomendado.toISOString(), chave_dedupe: s.chaveDedupe,
    });
  }

  let criadas = 0;
  if (novas.length > 0) {
    const { data, error } = await supabase.from("sugestoes_comerciais").upsert(novas, { onConflict: "chave_dedupe", ignoreDuplicates: true }).select("id");
    if (error) return { analisadas: lista.length, criadas: 0, vencidas: 0, resultados: 0, erro: error.message };
    criadas = data?.length ?? 0;
  }

  // Sugestões esquecidas há mais de 3 dias deixam de valer (a situação provavelmente mudou).
  const { data: vencidas } = await supabase.from("sugestoes_comerciais").update({ status: "vencida" }).eq("status", "sugerida").lt("criado_em", new Date(agora.getTime() - 3 * DIAS).toISOString()).select("id");

  // Resultado das enviadas: respondeu / sem resposta (após 48 h).
  let resultados = 0;
  const { data: enviadas } = await supabase.from("sugestoes_comerciais").select("id, conversa_id, enviada_em").eq("status", "enviada").is("resultado", null).not("enviada_em", "is", null).limit(200);
  for (const e of enviadas ?? []) {
    const { data: msgs } = await supabase.from("whatsapp_mensagens").select("direcao, conteudo, criado_em").eq("conversa_id", e.conversa_id).gt("criado_em", e.enviada_em);
    const r = resultadoDoAcompanhamento(e.enviada_em, (msgs ?? []).map((m) => ({ direcao: m.direcao, conteudo: m.conteudo, criadoEm: m.criado_em })), agora);
    if (r) {
      await supabase.from("sugestoes_comerciais").update({ resultado: r, resultado_em: agora.toISOString() }).eq("id", e.id).is("resultado", null);
      resultados += 1;
    }
  }

  return { analisadas: lista.length, criadas, vencidas: vencidas?.length ?? 0, resultados };
}

// ---------------------------------------------------------------------------
// Operações da equipe (sessão do usuário — RLS vale)
// ---------------------------------------------------------------------------

const CAMPOS = "id, conversa_id, card_id, cliente_id, responsavel_id, tipo, motivo, mensagem_sugerida, mensagem_final, prioridade, horario_recomendado, status, adiada_ate, resultado, resultado_obs, criado_em, enviada_em, conversa:whatsapp_conversas(telefone), cliente:clientes(nome)";

function mapear(r: Record<string, unknown>): SugestaoComercial {
  const conversa = r.conversa as { telefone?: string } | null;
  const cliente = r.cliente as { nome?: string } | null;
  const { conversa: _c, cliente: _cl, ...resto } = r;
  void _c; void _cl;
  return { ...(resto as unknown as SugestaoComercial), cliente_nome: cliente?.nome ?? null, telefone: conversa?.telefone ?? null };
}

export async function listarSugestoes(opcoes: { responsavelId?: string; incluirConcluidas?: boolean; limite?: number } = {}): Promise<SugestaoComercial[]> {
  const supabase = await createClient();
  let q = supabase.from("sugestoes_comerciais").select(CAMPOS);
  q = opcoes.incluirConcluidas ? q.in("status", ["sugerida", "adiada", "enviada", "descartada"]) : q.in("status", ["sugerida", "adiada"]);
  if (opcoes.responsavelId) q = q.eq("responsavel_id", opcoes.responsavelId);
  const { data, error } = await q.order("prioridade", { ascending: true }).order("horario_recomendado", { ascending: true }).limit(opcoes.limite ?? 50);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapear(r as Record<string, unknown>));
}

export async function obterConfigBot(): Promise<{ modo: "assistente" | "automatico"; hora_inicio: number; hora_fim: number; permite_domingo: boolean; configurado: boolean }> {
  const supabase = await createClient();
  const { data } = await supabase.from("configuracoes_bot").select("*").maybeSingle();
  const j = janelaDaConfig(data);
  return { modo: modoDoBot(data), hora_inicio: j.horaInicio, hora_fim: j.horaFim, permite_domingo: j.permiteDomingo, configurado: !!data };
}

export async function salvarConfigBot(input: { modo: "assistente" | "automatico"; hora_inicio: number; hora_fim: number; permite_domingo: boolean }, usuarioId: string): Promise<void> {
  if (!(input.hora_fim > input.hora_inicio)) throw new Error("O horário final precisa ser depois do inicial.");
  const supabase = await createClient();
  const { data: perfil } = await supabase.from("usuarios").select("loja_id").eq("id", usuarioId).maybeSingle();
  if (!perfil?.loja_id) throw new Error("Loja do usuário não encontrada.");
  const { error } = await supabase.from("configuracoes_bot").upsert({ loja_id: perfil.loja_id, ...input, atualizado_por: usuarioId, updated_at: new Date().toISOString() }, { onConflict: "loja_id" });
  if (error) throw new Error(`Não foi possível salvar: ${error.message}`);
}

/**
 * Envia a sugestão APROVADA pela vendedora (texto possivelmente editado). Reserva a sugestão antes
 * de enviar (compare-and-set), então duplo clique/duas abas não geram duas mensagens.
 */
export async function aprovarEEnviarSugestao(id: string, texto: string, usuarioId: string): Promise<void> {
  const mensagem = texto.trim();
  if (mensagem.length < 2) throw new Error("A mensagem está vazia.");
  const supabase = await createClient();

  const { data: sug } = await supabase.from("sugestoes_comerciais").select("id, conversa_id, status, loja_id").eq("id", id).maybeSingle();
  if (!sug) throw new Error("Sugestão não encontrada.");
  if (sug.status !== "sugerida" && sug.status !== "adiada") throw new Error("Esta sugestão já foi tratada.");

  const { data: conversa } = await supabase.from("whatsapp_conversas").select("*").eq("id", sug.conversa_id).maybeSingle();
  if (!conversa) throw new Error("Conversa não encontrada.");
  const { data: cfg } = await supabase.from("configuracoes_bot").select("*").maybeSingle();

  const { data: ultimaEnviada } = await supabase.from("sugestoes_comerciais").select("enviada_em").eq("conversa_id", sug.conversa_id).eq("status", "enviada").order("enviada_em", { ascending: false }).limit(1).maybeSingle();
  const veredito = avaliarEnvioAutomatico({ agora: new Date(), naoContatar: (conversa as { nao_contatar?: boolean }).nao_contatar === true, ultimoEnvioAutomaticoEm: ultimaEnviada?.enviada_em ?? null, janela: janelaDaConfig(cfg) });
  if (!veredito.permitido) {
    if (veredito.motivo === "nao_contatar") throw new Error("Este cliente pediu para não ser contatado. A sugestão foi bloqueada.");
    if (veredito.motivo === "fora_do_horario") throw new Error("Fora do horário comercial configurado. Use “Adiar” para enviar no próximo horário permitido.");
    throw new Error("Já houve um envio guiado para este cliente nas últimas 24 horas.");
  }

  const { data: reservada } = await supabase.from("sugestoes_comerciais")
    .update({ status: "enviada", mensagem_final: mensagem, decidido_por: usuarioId, decidido_em: new Date().toISOString(), enviada_em: new Date().toISOString() })
    .eq("id", id).in("status", ["sugerida", "adiada"]).select("id");
  if (!reservada || reservada.length === 0) throw new Error("Esta sugestão já foi tratada por outra pessoa.");

  try {
    // Antes, falha do provedor não lançava erro e a sugestão ficava como
    // "enviada" sem a mensagem ter saído. Agora confirma antes de manter.
    exigirEnvioConfirmado(await enviarMensagem({ conversaId: sug.conversa_id, telefone: conversa.telefone, texto: mensagem, usuarioId }));
  } catch (err) {
    await supabase.from("sugestoes_comerciais").update({ status: "sugerida", mensagem_final: null, enviada_em: null, decidido_por: null, decidido_em: null }).eq("id", id);
    throw err instanceof Error ? err : new Error("Falha ao enviar a mensagem.");
  }
}

export async function adiarSugestao(id: string, ate: Date, usuarioId: string): Promise<Date> {
  if (ate.getTime() <= Date.now()) throw new Error("Escolha um horário no futuro.");
  const supabase = await createClient();
  const { data: cfg } = await supabase.from("configuracoes_bot").select("*").maybeSingle();
  const efetivo = proximoHorarioPermitido(ate, janelaDaConfig(cfg));
  const { data, error } = await supabase.from("sugestoes_comerciais")
    .update({ status: "adiada", adiada_ate: efetivo.toISOString(), horario_recomendado: efetivo.toISOString(), decidido_por: usuarioId, decidido_em: new Date().toISOString() })
    .eq("id", id).in("status", ["sugerida", "adiada"]).select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Esta sugestão já foi tratada.");
  return efetivo;
}

export async function descartarSugestao(id: string, motivo: string, usuarioId: string): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("sugestoes_comerciais")
    .update({ status: "descartada", motivo_descarte: motivo.trim() || null, decidido_por: usuarioId, decidido_em: new Date().toISOString() })
    .eq("id", id).in("status", ["sugerida", "adiada"]).select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Esta sugestão já foi tratada.");
}

export async function registrarResultadoSugestao(id: string, resultado: "respondeu" | "sem_resposta" | "fechou" | "perdido", obs: string | null): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("sugestoes_comerciais")
    .update({ resultado, resultado_obs: obs?.trim() || null, resultado_em: new Date().toISOString() })
    .eq("id", id).eq("status", "enviada").select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Só dá para registrar o resultado de uma sugestão já enviada.");
}
