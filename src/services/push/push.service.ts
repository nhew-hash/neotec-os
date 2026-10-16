import "server-only";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { aceitaCategoria, inscricaoExpirada, urlSegura, type CategoriaPush, type PayloadPush } from "./push";

/**
 * Envio de Web Push (notificação no celular/computador mesmo com o app fechado).
 * Só roda no servidor. A chave privada VAPID vem da env ou da tabela
 * configuracoes_push (sem policy: só a service role lê) e nunca vai ao navegador.
 */

type Chaves = { publica: string; privada: string; contato: string };
let cacheChaves: Chaves | null = null;

export async function obterChavesVapid(): Promise<Chaves | null> {
  if (cacheChaves) return cacheChaves;
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    cacheChaves = { publica: process.env.VAPID_PUBLIC_KEY, privada: process.env.VAPID_PRIVATE_KEY, contato: process.env.VAPID_CONTATO ?? "mailto:contato@neotecbrasil.com" };
    return cacheChaves;
  }
  const { data, error } = await createAdminClient().from("configuracoes_push").select("vapid_public_key, vapid_private_key, contato").limit(1).maybeSingle();
  if (error) throw new Error(`Não foi possível ler as chaves de notificação: ${error.message}`);
  if (!data) return null;
  cacheChaves = { publica: data.vapid_public_key, privada: data.vapid_private_key, contato: data.contato };
  return cacheChaves;
}

/** Chave pública (segura para o navegador) — usada para inscrever o aparelho. */
export async function chavePublicaVapid(): Promise<string | null> {
  return (await obterChavesVapid())?.publica ?? null;
}

export type ResultadoEnvio = { enviados: number; falhas: number; semAparelho: boolean };

/** Envia para todos os aparelhos ativos das pessoas indicadas que aceitam a categoria. */
export async function enviarPush(usuarioIds: string[], categoria: CategoriaPush, payload: PayloadPush): Promise<ResultadoEnvio> {
  const ids = [...new Set(usuarioIds.filter(Boolean))];
  if (ids.length === 0) return { enviados: 0, falhas: 0, semAparelho: true };
  const chaves = await obterChavesVapid();
  if (!chaves) throw new Error("Chaves de notificação não configuradas (configuracoes_push).");

  const supabase = createAdminClient();
  const { data: inscricoes, error } = await supabase
    .from("push_inscricoes")
    .select("id, endpoint, p256dh, auth, preferencias, falhas")
    .in("usuario_id", ids)
    .eq("ativo", true);
  if (error) throw new Error(`Não foi possível ler os aparelhos inscritos: ${error.message}`);
  const alvo = (inscricoes ?? []).filter((i) => aceitaCategoria(i.preferencias, categoria));
  if (alvo.length === 0) return { enviados: 0, falhas: 0, semAparelho: true };

  const corpo = JSON.stringify({ ...payload, url: urlSegura(payload.url) });
  let enviados = 0;
  let falhas = 0;
  await Promise.all(alvo.map(async (i) => {
    try {
      await webpush.sendNotification(
        { endpoint: i.endpoint, keys: { p256dh: i.p256dh, auth: i.auth } },
        corpo,
        { vapidDetails: { subject: chaves.contato, publicKey: chaves.publica, privateKey: chaves.privada }, TTL: 60 * 60 * 12, urgency: "high" },
      );
      enviados++;
      await supabase.from("push_inscricoes").update({ ultimo_envio_em: new Date().toISOString(), falhas: 0 }).eq("id", i.id);
    } catch (err) {
      falhas++;
      const status = (err as { statusCode?: number }).statusCode;
      if (inscricaoExpirada(status)) {
        await supabase.from("push_inscricoes").update({ ativo: false }).eq("id", i.id);
      } else {
        console.error(`Falha ao enviar notificação (status ${status ?? "?"}):`, err instanceof Error ? err.message : err);
        // Muitas falhas seguidas (serviço do navegador recusando): desativa para não insistir para sempre.
        await supabase.from("push_inscricoes").update({ falhas: (i.falhas ?? 0) + 1, ativo: (i.falhas ?? 0) + 1 < 10 }).eq("id", i.id);
      }
    }
  }));
  return { enviados, falhas, semAparelho: false };
}

const EQUIPE_ATENDIMENTO = ["admin", "gerente", "vendedor"];

async function usuariosAtivosPorCargo(cargos: string[]): Promise<string[]> {
  const { data, error } = await createAdminClient().from("usuarios").select("id").in("cargo", cargos).eq("status", "ativo");
  if (error) throw new Error(`Não foi possível ler a equipe: ${error.message}`);
  return (data ?? []).map((u) => u.id);
}

/**
 * Mensagem nova de cliente: avisa a responsável pela conversa; sem responsável,
 * a equipe de atendimento. Conversa marcada "não contatar" não gera aviso.
 */
export async function notificarNovaMensagem(input: { conversaId: string; tipo: string; resumo: string; nomeContato?: string | null; telefone: string }): Promise<void> {
  const supabase = createAdminClient();
  const { data: conversa, error } = await supabase
    .from("whatsapp_conversas")
    .select("id, responsavel_id, nao_contatar, cliente:clientes(nome)")
    .eq("id", input.conversaId)
    .maybeSingle();
  if (error) throw new Error(`Não foi possível ler a conversa para o aviso: ${error.message}`);
  if (!conversa || conversa.nao_contatar) return;

  let destino: string[] = [];
  if (conversa.responsavel_id) {
    const { data: resp } = await supabase.from("usuarios").select("id").eq("id", conversa.responsavel_id).eq("status", "ativo").maybeSingle();
    if (resp) destino = [resp.id];
  }
  if (destino.length === 0) destino = await usuariosAtivosPorCargo(EQUIPE_ATENDIMENTO);

  const cliente = conversa.cliente as unknown as { nome: string | null } | null;
  const titulo = cliente?.nome?.trim() || input.nomeContato?.trim() || input.telefone;
  await enviarPush(destino, "mensagens", { titulo, corpo: input.resumo, url: `/comunicacao/${conversa.id}`, tag: `conversa-${conversa.id}` });
}

/** Pedido de desconto: avisa gerente/admin. */
export async function notificarPedidoDesconto(input: { solicitanteNome: string; percentual: number }): Promise<void> {
  const destino = await usuariosAtivosPorCargo(["admin", "gerente"]);
  await enviarPush(destino, "aprovacoes", {
    titulo: "Pedido de desconto",
    corpo: `${input.solicitanteNome} pediu ${input.percentual.toFixed(1).replace(".", ",")}% de desconto. Toque para decidir.`,
    url: "/central-comercial/gerente",
    tag: "aprovacoes-desconto",
  });
}

/** Decisão do desconto: avisa quem pediu. */
export async function notificarDecisaoDesconto(input: { solicitanteId: string; aprovado: boolean }): Promise<void> {
  await enviarPush([input.solicitanteId], "aprovacoes", {
    titulo: input.aprovado ? "Desconto aprovado" : "Desconto recusado",
    corpo: input.aprovado ? "Já pode usar no PDV." : "Veja o motivo na Central comercial.",
    url: input.aprovado ? "/vendas/pdv" : "/central-comercial",
    tag: "decisao-desconto",
  });
}

/**
 * Retornos do CRM que venceram nas últimas 2 horas e ainda não foram avisados.
 * Roda no máximo a cada 5 minutos (trava atômica em configuracoes_push), chamado
 * a cada mensagem recebida e pelo cron diário — sem precisar de um agendador extra.
 * Lembrete de cliente "não contatar" não é avisado.
 */
export async function avisarRetornosVencidos(): Promise<number> {
  const supabase = createAdminClient();
  const agora = new Date();
  const { data: trava, error: erroTrava } = await supabase
    .from("configuracoes_push")
    .update({ retornos_verificados_em: agora.toISOString() })
    .lt("retornos_verificados_em", new Date(agora.getTime() - 5 * 60_000).toISOString())
    .select("loja_id");
  if (erroTrava) throw new Error(`Falha na trava dos retornos: ${erroTrava.message}`);
  if (!trava || trava.length === 0) return 0;

  const { data: vencidos, error } = await supabase
    .from("crm_followups")
    .select("id, usuario_id, motivo, cliente_id, card_id, cliente:clientes(nome)")
    .eq("status", "pendente")
    .is("push_enviado_em", null)
    .lte("data_agendada", agora.toISOString())
    .gte("data_agendada", new Date(agora.getTime() - 2 * 3600_000).toISOString())
    .limit(50);
  if (error) throw new Error(`Não foi possível ler os retornos: ${error.message}`);
  if (!vencidos || vencidos.length === 0) return 0;

  const clienteIds = [...new Set(vencidos.map((v) => v.cliente_id).filter((x): x is string => !!x))];
  const bloqueados = new Set<string>();
  if (clienteIds.length > 0) {
    const { data: optOut, error: erroOpt } = await supabase.from("whatsapp_conversas").select("cliente_id").in("cliente_id", clienteIds).eq("nao_contatar", true);
    if (erroOpt) throw new Error(`Não foi possível checar "não contatar": ${erroOpt.message}`);
    for (const c of optOut ?? []) if (c.cliente_id) bloqueados.add(c.cliente_id);
  }

  let avisados = 0;
  for (const v of vencidos) {
    // Marca antes de enviar: se duas execuções se cruzarem, só uma avisa.
    const { data: marcado } = await supabase.from("crm_followups").update({ push_enviado_em: agora.toISOString() }).eq("id", v.id).is("push_enviado_em", null).select("id");
    if (!marcado || marcado.length === 0) continue;
    if (!v.usuario_id || (v.cliente_id && bloqueados.has(v.cliente_id))) continue;
    const cliente = v.cliente as unknown as { nome: string | null } | null;
    await enviarPush([v.usuario_id], "retornos", {
      titulo: `Retorno: ${cliente?.nome?.trim() || "cliente"}`,
      corpo: v.motivo || "Hora de dar o retorno combinado.",
      url: v.cliente_id ? `/central-comercial/atendimento?cliente=${v.cliente_id}` : "/central-comercial",
      tag: `retorno-${v.id}`,
    });
    avisados++;
  }
  return avisados;
}
