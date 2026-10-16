"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirCargo } from "@/lib/auth/exigir-cargo";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { chavePublicaVapid, enviarPush } from "@/services/push/push.service";
import { lerPreferencias, normalizarImei, type PreferenciasPush } from "@/services/push/push";
import { caminhoFotoValido, rotaDoContexto, ROTULO_CONTEXTO, type ContextoCaptura, type TipoCaptura } from "./captura";
import type { ActionResult } from "@/types";

const STAFF = ["admin", "gerente", "vendedor", "tecnico"] as const;
const BUCKET = "os-fotos";

function erro(err: unknown, padrao: string): { success: false; error: string } {
  return { success: false, error: err instanceof Error ? err.message : padrao };
}

// ---------------------------------------------------------------------------
// Notificações neste aparelho
// ---------------------------------------------------------------------------

export async function obterChavePublicaAction(): Promise<ActionResult<string>> {
  const auth = await exigirCargo(STAFF);
  if (!auth.permitido) return { success: false, error: auth.erro };
  try {
    const chave = await chavePublicaVapid();
    if (!chave) return { success: false, error: "Notificações ainda não configuradas no servidor." };
    return { success: true, data: chave };
  } catch (err) {
    return erro(err, "Não foi possível preparar as notificações.");
  }
}

const inscricaoSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().min(10).max(300), auth: z.string().min(4).max(100) }),
  userAgent: z.string().max(300).optional(),
});

/** Grava (ou passa para a pessoa logada) a inscrição deste navegador/app. */
export async function salvarInscricaoAction(input: unknown): Promise<ActionResult<PreferenciasPush>> {
  const auth = await exigirCargo(STAFF);
  if (!auth.permitido) return { success: false, error: auth.erro };
  const parsed = inscricaoSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Inscrição do navegador inválida. Tente ativar de novo." };
  try {
    // Admin: o mesmo aparelho pode ter sido de outra pessoa (saiu e entrou outra conta);
    // a inscrição passa para quem está logado agora — a identidade vem da sessão, não do cliente.
    const admin = createAdminClient();
    const { data: existente, error: erroLer } = await admin.from("push_inscricoes").select("preferencias, usuario_id").eq("endpoint", parsed.data.endpoint).maybeSingle();
    if (erroLer) throw new Error(erroLer.message);
    const preferencias = existente && existente.usuario_id === auth.userId ? lerPreferencias(existente.preferencias) : lerPreferencias(null);
    const { error } = await admin.from("push_inscricoes").upsert({
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      user_agent: parsed.data.userAgent ?? null,
      usuario_id: auth.userId,
      preferencias,
      ativo: true,
      falhas: 0,
    }, { onConflict: "endpoint" });
    if (error) throw new Error(error.message);
    return { success: true, data: preferencias };
  } catch (err) {
    return erro(err, "Não foi possível ativar as notificações.");
  }
}

export async function statusInscricaoAction(endpoint: string): Promise<ActionResult<{ ativa: boolean; preferencias: PreferenciasPush }>> {
  const auth = await exigirCargo(STAFF);
  if (!auth.permitido) return { success: false, error: auth.erro };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("push_inscricoes").select("ativo, preferencias").eq("endpoint", endpoint).maybeSingle();
    if (error) throw new Error(error.message);
    return { success: true, data: { ativa: !!data?.ativo, preferencias: lerPreferencias(data?.preferencias) } };
  } catch (err) {
    return erro(err, "Não foi possível ler as notificações deste aparelho.");
  }
}

const prefsSchema = z.object({ mensagens: z.boolean(), retornos: z.boolean(), aprovacoes: z.boolean() });

export async function salvarPreferenciasAction(endpoint: string, prefs: unknown): Promise<ActionResult> {
  const auth = await exigirCargo(STAFF);
  if (!auth.permitido) return { success: false, error: auth.erro };
  const parsed = prefsSchema.safeParse(prefs);
  if (!parsed.success) return { success: false, error: "Preferências inválidas." };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("push_inscricoes").update({ preferencias: parsed.data }).eq("endpoint", endpoint).select("id");
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return { success: false, error: "Este aparelho não está com notificações ativas." };
    return { success: true, data: undefined };
  } catch (err) {
    return erro(err, "Não foi possível salvar as preferências.");
  }
}

export async function removerInscricaoAction(endpoint: string): Promise<ActionResult> {
  const auth = await exigirCargo(STAFF);
  if (!auth.permitido) return { success: false, error: auth.erro };
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("push_inscricoes").delete().eq("endpoint", endpoint);
    if (error) throw new Error(error.message);
    return { success: true, data: undefined };
  } catch (err) {
    return erro(err, "Não foi possível desativar.");
  }
}

/** Manda uma notificação de teste para os aparelhos da própria pessoa. Sucesso só se o serviço de push aceitou. */
export async function testarNotificacaoAction(): Promise<ActionResult<{ enviados: number }>> {
  const auth = await exigirCargo(STAFF);
  if (!auth.permitido) return { success: false, error: auth.erro };
  try {
    const r = await enviarPush([auth.userId], "capturas", { titulo: "Neotec OS", corpo: "Notificações funcionando neste aparelho ✅", url: "/celular", tag: "teste" });
    if (r.semAparelho) return { success: false, error: "Nenhum aparelho com notificação ativa para você." };
    if (r.enviados === 0) return { success: false, error: "O serviço de notificação recusou o envio. Desative e ative de novo neste aparelho." };
    return { success: true, data: { enviados: r.enviados } };
  } catch (err) {
    return erro(err, "Não foi possível enviar o teste.");
  }
}

// ---------------------------------------------------------------------------
// Captura pelo celular (fotos / IMEI) pedida no computador
// ---------------------------------------------------------------------------

const contextoSchema = z.object({
  contextoTipo: z.enum(["os", "trade_in", "aparelho"]),
  contextoId: z.string().uuid(),
});

const TABELA_CONTEXTO: Record<ContextoCaptura, string> = { os: "ordens_servico", trade_in: "avaliacoes_trade_in", aparelho: "aparelhos" };

/** Confere, com a RLS de quem pediu, que o registro existe e a pessoa enxerga. */
async function contextoExiste(supabase: Awaited<ReturnType<typeof createClient>>, tipo: ContextoCaptura, id: string): Promise<boolean> {
  const { data, error } = await supabase.from(TABELA_CONTEXTO[tipo]).select("id").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return !!data;
}

const criarSchema = contextoSchema.extend({
  tipo: z.enum(["fotos", "imei"]),
  rotulo: z.string().trim().max(120).optional(),
  /** Celular de quem vai tirar (padrão: o próprio). Quem está no computador nem sempre está com o celular. */
  destinoId: z.string().uuid().optional(),
});

export type CapturaCriada = { id: string; avisado: boolean; destinoNome: string | null };

export type CelularEquipe = { id: string; nome: string; souEu: boolean };

/** Pessoas da equipe com notificação ativa em algum celular — para escolher para quem mandar o pedido. */
export async function listarCelularesEquipeAction(): Promise<ActionResult<CelularEquipe[]>> {
  const auth = await exigirCargo(STAFF);
  if (!auth.permitido) return { success: false, error: auth.erro };
  try {
    // Admin: a RLS só deixa cada um ver as próprias inscrições; aqui sai só o nome, nunca o aparelho.
    const admin = createAdminClient();
    const { data, error } = await admin.from("push_inscricoes").select("usuario_id, usuario:usuarios!inner(nome, cargo, status)").eq("ativo", true);
    if (error) throw new Error(error.message);
    const mapa = new Map<string, CelularEquipe>();
    for (const r of data ?? []) {
      const u = r.usuario as unknown as { nome: string; cargo: string; status: string } | null;
      if (!u || u.status !== "ativo" || !(STAFF as readonly string[]).includes(u.cargo)) continue;
      mapa.set(r.usuario_id, { id: r.usuario_id, nome: u.nome, souEu: r.usuario_id === auth.userId });
    }
    return { success: true, data: [...mapa.values()].sort((a, b) => Number(b.souEu) - Number(a.souEu) || a.nome.localeCompare(b.nome)) };
  } catch (err) {
    return erro(err, "Não foi possível listar os celulares da equipe.");
  }
}

export async function criarCapturaAction(input: unknown): Promise<ActionResult<CapturaCriada>> {
  const auth = await exigirCargo(STAFF);
  if (!auth.permitido) return { success: false, error: auth.erro };
  const parsed = criarSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Pedido inválido." };
  const { tipo, contextoTipo, contextoId, rotulo } = parsed.data;
  const destinoId = parsed.data.destinoId ?? auth.userId;
  try {
    const supabase = await createClient();
    // O registro tem de existir para QUEM PEDIU (RLS de quem está no computador).
    if (!(await contextoExiste(supabase, contextoTipo, contextoId))) return { success: false, error: "Registro não encontrado." };
    // Admin a partir daqui: o pedido fica no nome do dono do celular (é ele que conclui),
    // com quem pediu em solicitante_id. O destino precisa ser da equipe e estar ativo.
    const admin = createAdminClient();
    const [{ data: destino, error: erroDestino }, { data: eu }] = await Promise.all([
      admin.from("usuarios").select("id, nome, cargo, status").eq("id", destinoId).maybeSingle(),
      admin.from("usuarios").select("nome").eq("id", auth.userId).maybeSingle(),
    ]);
    if (erroDestino) throw new Error(erroDestino.message);
    if (!destino || destino.status !== "ativo" || !(STAFF as readonly string[]).includes(destino.cargo)) return { success: false, error: "Essa pessoa não pode receber o pedido." };
    // Um pedido aberto por vez para o mesmo registro/tipo feito por mim: cancela o anterior.
    const { error: erroCancelar } = await admin.from("capturas_celular").update({ status: "cancelada" })
      .or(`usuario_id.eq.${auth.userId},solicitante_id.eq.${auth.userId}`)
      .eq("contexto_tipo", contextoTipo).eq("contexto_id", contextoId).eq("tipo", tipo).eq("status", "pendente");
    if (erroCancelar) throw new Error(erroCancelar.message);
    const { data, error } = await admin.from("capturas_celular")
      .insert({ usuario_id: destino.id, solicitante_id: auth.userId, tipo, contexto_tipo: contextoTipo, contexto_id: contextoId, rotulo: rotulo || null })
      .select("id").single();
    if (error || !data) throw new Error(error?.message ?? "sem retorno");

    let avisado = false;
    const deOutraPessoa = destino.id !== auth.userId;
    try {
      const r = await enviarPush([destino.id], "capturas", {
        titulo: tipo === "fotos" ? "Tirar fotos do aparelho" : "Ler o IMEI",
        corpo: `${deOutraPessoa ? `${eu?.nome ?? "Alguém da equipe"} pediu · ` : ""}${ROTULO_CONTEXTO[contextoTipo]}${rotulo ? ` — ${rotulo}` : ""}. Toque para abrir a câmera.`,
        url: `/celular/captura/${data.id}`,
        tag: `captura-${data.id}`,
      });
      avisado = r.enviados > 0;
    } catch (err) {
      console.error("Falha ao avisar o celular da captura:", err instanceof Error ? err.message : err);
    }
    return { success: true, data: { id: data.id, avisado, destinoNome: deOutraPessoa ? destino.nome : null } };
  } catch (err) {
    return erro(err, "Não foi possível pedir ao celular.");
  }
}

export type CapturaDetalhe = {
  id: string;
  tipo: TipoCaptura;
  contextoTipo: ContextoCaptura;
  contextoId: string;
  rotulo: string | null;
  status: "pendente" | "concluida" | "cancelada";
  expirada: boolean;
  imei: string | null;
  fotos: { caminho: string; url: string | null }[];
  voltarPara: string;
};

async function assinar(supabase: Awaited<ReturnType<typeof createClient>>, caminhos: string[]): Promise<Map<string, string | null>> {
  const mapa = new Map<string, string | null>();
  if (caminhos.length === 0) return mapa;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(caminhos, 60 * 60);
  if (error) throw new Error(`Não foi possível abrir as fotos: ${error.message}`);
  for (const d of data ?? []) if (d.path) mapa.set(d.path, d.signedUrl ?? null);
  return mapa;
}

export async function obterCapturaAction(id: string): Promise<ActionResult<CapturaDetalhe>> {
  const auth = await exigirCargo(STAFF);
  if (!auth.permitido) return { success: false, error: auth.erro };
  if (!z.string().uuid().safeParse(id).success) return { success: false, error: "Pedido inválido." };
  try {
    const supabase = await createClient();
    const { data: c, error } = await supabase.from("capturas_celular").select("id, tipo, contexto_tipo, contexto_id, rotulo, status, imei, fotos, expira_em").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!c) return { success: false, error: "Pedido não encontrado (ou é de outra pessoa)." };
    const urls = await assinar(supabase, c.fotos ?? []);
    return {
      success: true,
      data: {
        id: c.id, tipo: c.tipo, contextoTipo: c.contexto_tipo, contextoId: c.contexto_id, rotulo: c.rotulo,
        status: c.status, expirada: new Date(c.expira_em).getTime() < Date.now(), imei: c.imei,
        fotos: (c.fotos ?? []).map((p: string) => ({ caminho: p, url: urls.get(p) ?? null })),
        voltarPara: rotaDoContexto(c.contexto_tipo, c.contexto_id),
      },
    };
  } catch (err) {
    return erro(err, "Não foi possível abrir o pedido.");
  }
}

const concluirSchema = z.object({
  fotos: z.array(z.string().max(300)).max(30).default([]),
  imei: z.string().max(40).optional(),
});

/**
 * O celular terminou: grava as fotos (já enviadas ao bucket) e/ou o IMEI.
 * IMEI na troca/aparelho é gravado no próprio registro com a permissão de quem
 * está logado (a RLS decide). Na OS fica no pedido e aparece na tela da OS.
 */
export async function concluirCapturaAction(id: string, input: unknown): Promise<ActionResult<{ imeiAplicado: boolean; aviso: string | null }>> {
  const auth = await exigirCargo(STAFF);
  if (!auth.permitido) return { success: false, error: auth.erro };
  const parsed = concluirSchema.safeParse(input);
  if (!parsed.success || !z.string().uuid().safeParse(id).success) return { success: false, error: "Dados inválidos." };
  try {
    const supabase = await createClient();
    const { data: c, error } = await supabase.from("capturas_celular").select("id, usuario_id, tipo, contexto_tipo, contexto_id, status, fotos").eq("id", id).eq("usuario_id", auth.userId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!c) return { success: false, error: "Pedido não encontrado." };
    if (c.status !== "pendente") return { success: false, error: c.status === "concluida" ? "Este pedido já foi concluído." : "Este pedido foi cancelado no computador." };

    const fotos = parsed.data.fotos;
    if (fotos.some((p) => !caminhoFotoValido(p, c.contexto_tipo, c.contexto_id))) return { success: false, error: "Foto fora do lugar esperado." };
    let imei: string | null = null;
    if (c.tipo === "imei") {
      imei = normalizarImei(parsed.data.imei ?? "");
      if (!imei) return { success: false, error: "IMEI inválido: precisa ter 15 dígitos e conferir o dígito verificador." };
    } else if (fotos.length === 0) {
      return { success: false, error: "Tire pelo menos uma foto." };
    }

    const { error: erroUpd } = await supabase.from("capturas_celular")
      .update({ status: "concluida", concluida_em: new Date().toISOString(), fotos: [...(c.fotos ?? []), ...fotos], imei })
      .eq("id", id).eq("status", "pendente");
    if (erroUpd) throw new Error(erroUpd.message);

    let imeiAplicado = false;
    let aviso: string | null = null;
    if (imei && (c.contexto_tipo === "trade_in" || c.contexto_tipo === "aparelho")) {
      const { data: upd, error: erroImei } = await supabase.from(TABELA_CONTEXTO[c.contexto_tipo as ContextoCaptura]).update({ imei }).eq("id", c.contexto_id).select("id");
      if (erroImei || !upd || upd.length === 0) aviso = "IMEI lido e guardado no pedido, mas você não tem permissão para gravá-lo no cadastro. Peça à gerência.";
      else imeiAplicado = true;
    }
    revalidatePath(rotaDoContexto(c.contexto_tipo, c.contexto_id));
    return { success: true, data: { imeiAplicado, aviso } };
  } catch (err) {
    return erro(err, "Não foi possível concluir.");
  }
}

export async function cancelarCapturaAction(id: string): Promise<ActionResult> {
  const auth = await exigirCargo(STAFF);
  if (!auth.permitido) return { success: false, error: auth.erro };
  try {
    if (!z.string().uuid().safeParse(id).success) return { success: false, error: "Pedido inválido." };
    // Cancela quem vai tirar (celular) ou quem pediu (computador).
    const { error } = await createAdminClient().from("capturas_celular").update({ status: "cancelada" })
      .eq("id", id).or(`usuario_id.eq.${auth.userId},solicitante_id.eq.${auth.userId}`).eq("status", "pendente");
    if (error) throw new Error(error.message);
    return { success: true, data: undefined };
  } catch (err) {
    return erro(err, "Não foi possível cancelar.");
  }
}

export type CapturaPendente = { id: string; tipo: TipoCaptura; contextoTipo: ContextoCaptura; rotulo: string | null; criadoEm: string };

/** Pedidos abertos da pessoa — o celular mostra mesmo se a notificação não chegou. */
export async function listarCapturasPendentesAction(): Promise<ActionResult<CapturaPendente[]>> {
  const auth = await exigirCargo(STAFF);
  if (!auth.permitido) return { success: false, error: auth.erro };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("capturas_celular").select("id, tipo, contexto_tipo, rotulo, criado_em")
      .eq("usuario_id", auth.userId).eq("status", "pendente").gt("expira_em", new Date().toISOString()).order("criado_em", { ascending: false }).limit(10);
    if (error) throw new Error(error.message);
    return { success: true, data: (data ?? []).map((c) => ({ id: c.id, tipo: c.tipo, contextoTipo: c.contexto_tipo, rotulo: c.rotulo, criadoEm: c.criado_em })) };
  } catch (err) {
    return erro(err, "Não foi possível listar os pedidos.");
  }
}

/** Fotos tiradas direto no aparelho que está com a tela aberta (sem pedir a outro celular). */
export async function adicionarFotosAction(input: unknown): Promise<ActionResult> {
  const auth = await exigirCargo(STAFF);
  if (!auth.permitido) return { success: false, error: auth.erro };
  const parsed = contextoSchema.extend({ fotos: z.array(z.string().max(300)).min(1).max(30), rotulo: z.string().trim().max(120).optional() }).safeParse(input);
  if (!parsed.success) return { success: false, error: "Dados inválidos." };
  const { contextoTipo, contextoId, fotos, rotulo } = parsed.data;
  if (fotos.some((p) => !caminhoFotoValido(p, contextoTipo, contextoId))) return { success: false, error: "Foto fora do lugar esperado." };
  try {
    const supabase = await createClient();
    if (!(await contextoExiste(supabase, contextoTipo, contextoId))) return { success: false, error: "Registro não encontrado." };
    const { error } = await supabase.from("capturas_celular").insert({
      usuario_id: auth.userId, tipo: "fotos", contexto_tipo: contextoTipo, contexto_id: contextoId, rotulo: rotulo || null,
      status: "concluida", concluida_em: new Date().toISOString(), fotos,
    });
    if (error) throw new Error(error.message);
    revalidatePath(rotaDoContexto(contextoTipo, contextoId));
    return { success: true, data: undefined };
  } catch (err) {
    return erro(err, "Não foi possível guardar as fotos.");
  }
}

export type FotosDoContexto = {
  fotos: { caminho: string; url: string | null; em: string; rotulo: string | null }[];
  imeis: { imei: string; em: string }[];
  pendentes: { id: string; tipo: TipoCaptura }[];
};

export async function listarFotosContextoAction(input: unknown): Promise<ActionResult<FotosDoContexto>> {
  const auth = await exigirCargo(STAFF);
  if (!auth.permitido) return { success: false, error: auth.erro };
  const parsed = contextoSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dados inválidos." };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("capturas_celular").select("id, tipo, status, fotos, imei, rotulo, concluida_em, usuario_id, solicitante_id, expira_em")
      .eq("contexto_tipo", parsed.data.contextoTipo).eq("contexto_id", parsed.data.contextoId).in("status", ["concluida", "pendente"])
      .order("criado_em", { ascending: false }).limit(50);
    if (error) throw new Error(error.message);
    const concluidas = (data ?? []).filter((c) => c.status === "concluida");
    const caminhos = concluidas.flatMap((c) => c.fotos ?? []);
    const urls = await assinar(supabase, caminhos);
    return {
      success: true,
      data: {
        fotos: concluidas.flatMap((c) => (c.fotos ?? []).map((p: string) => ({ caminho: p, url: urls.get(p) ?? null, em: c.concluida_em, rotulo: c.rotulo }))),
        imeis: concluidas.filter((c) => c.imei).map((c) => ({ imei: c.imei as string, em: c.concluida_em })),
        pendentes: (data ?? []).filter((c) => c.status === "pendente" && (c.usuario_id === auth.userId || c.solicitante_id === auth.userId) && new Date(c.expira_em).getTime() > Date.now()).map((c) => ({ id: c.id, tipo: c.tipo })),
      },
    };
  } catch (err) {
    return erro(err, "Não foi possível carregar as fotos.");
  }
}
