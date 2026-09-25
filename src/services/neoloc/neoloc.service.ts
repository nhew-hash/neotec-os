import { createClient } from "@/lib/supabase/server";
import type { NeolocDispositivoResumo, NeolocConfiguracao, NeolocComando } from "@/types/neoloc";

/**
 * Leituras do NeoLoc. Segue o mesmo padrão de `crediario.service.ts` e
 * `contrato.service.ts`: funções `async` que abrem seu próprio client
 * (RLS já filtra por loja/cargo), sem cache manual.
 */

export interface DashboardNeoLoc {
  ativos: number;
  emCobranca: number;
  bloqueados: number;
  emRecolhimento: number;
  quitados: number;
  naoMatriculados: number;
  offline: number;
}

const OFFLINE_LIMITE_HORAS = 48;

export async function obterDashboardNeoLoc(): Promise<DashboardNeoLoc> {
  const dispositivos = await listarDispositivos();

  const agora = Date.now();
  let ativos = 0, emCobranca = 0, bloqueados = 0, emRecolhimento = 0, quitados = 0, naoMatriculados = 0, offline = 0;

  for (const d of dispositivos) {
    if (d.status_mdm === "nao_matriculado" || d.status_mdm === "pendente_matricula" || d.status_mdm === "erro_matricula") naoMatriculados++;
    if (d.status_crediario === "em_locacao" && d.dias_atraso === 0) ativos++;
    if (d.status_crediario === "atrasado" && d.dias_atraso > 0) emCobranca++;
    if (d.status_crediario === "atrasado" && d.contrato_status === "encerrando") emRecolhimento++;
    if (d.status_crediario === "adquirido" || d.contrato_status === "encerrado") quitados++;
    if (d.ultimo_checkin && agora - new Date(d.ultimo_checkin).getTime() > OFFLINE_LIMITE_HORAS * 3600 * 1000) offline++;
  }
  // "Bloqueado" no NeoLoc é refletido por um comando de bloqueio bem-sucedido mais recente que qualquer desbloqueio — calculado à parte porque depende da fila de comandos, não só do estado do dispositivo.
  const supabase = await createClient();
  const { data: comandos } = await supabase
    .from("neoloc_comandos")
    .select("dispositivo_id, tipo, status, created_at")
    .in("tipo", ["bloquear", "modo_perdido", "desbloquear"])
    .in("status", ["success", "acknowledged"])
    .order("created_at", { ascending: false });

  const ultimoPorDispositivo = new Map<string, string>();
  for (const c of comandos ?? []) {
    if (!ultimoPorDispositivo.has(c.dispositivo_id)) ultimoPorDispositivo.set(c.dispositivo_id, c.tipo);
  }
  bloqueados = [...ultimoPorDispositivo.values()].filter((t) => t === "bloquear" || t === "modo_perdido").length;

  return { ativos, emCobranca, bloqueados, emRecolhimento, quitados, naoMatriculados, offline };
}

export async function listarDispositivos(): Promise<NeolocDispositivoResumo[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("neoloc_dispositivos")
    .select(`
      id, status_mdm, ultimo_checkin, contrato_id,
      aparelho:aparelhos(id, imei, numero_serie, cor, status_crediario, produto:produtos(nome)),
      cliente:clientes(nome),
      contrato:contratos(numero, status)
    `)
    .order("created_at", { ascending: false });

  const dispositivos = data ?? [];
  const contratoIds = dispositivos.map((d) => d.contrato_id).filter(Boolean) as string[];

  // dias_atraso: pega a parcela em atraso mais recente de cada contrato vinculado (reaproveita crediario_parcelas, nunca duplica o cálculo).
  const diasAtrasoPorContrato = new Map<string, number>();
  if (contratoIds.length > 0) {
    const { data: parcelas } = await supabase
      .from("crediario_parcelas")
      .select("contrato_id, dias_atraso")
      .in("contrato_id", contratoIds)
      .eq("status", "atrasado")
      .order("dias_atraso", { ascending: false });
    for (const p of parcelas ?? []) {
      if (!diasAtrasoPorContrato.has(p.contrato_id)) diasAtrasoPorContrato.set(p.contrato_id, p.dias_atraso);
    }
  }

  return dispositivos.map((d) => {
    const raw = d as unknown as {
      id: string; status_mdm: NeolocDispositivoResumo["status_mdm"]; ultimo_checkin: string | null; contrato_id?: string;
      aparelho: { id: string; imei: string; numero_serie: string | null; cor: string | null; status_crediario: string | null; produto: { nome: string } | null } | null;
      cliente: { nome: string } | null;
      contrato: { numero: string; status: string } | null;
    };
    return {
      id: raw.id,
      status_mdm: raw.status_mdm,
      ultimo_checkin: raw.ultimo_checkin,
      aparelho: raw.aparelho
        ? { id: raw.aparelho.id, imei: raw.aparelho.imei, numero_serie: raw.aparelho.numero_serie, cor: raw.aparelho.cor, produto_nome: raw.aparelho.produto?.nome ?? null }
        : null,
      cliente_nome: raw.cliente?.nome ?? null,
      contrato_numero: raw.contrato?.numero ?? null,
      contrato_status: raw.contrato?.status ?? null,
      status_crediario: raw.aparelho?.status_crediario ?? null,
      dias_atraso: raw.contrato_id ? diasAtrasoPorContrato.get(raw.contrato_id) ?? 0 : 0,
    };
  });
}

export async function buscarDispositivoPorId(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("neoloc_dispositivos")
    .select(`
      *,
      aparelho:aparelhos(id, imei, numero_serie, cor, memoria, status_crediario, produto:produtos(nome)),
      cliente:clientes(id, nome, whatsapp),
      contrato:contratos(id, numero, status, valor_pagamento, frequencia_pagamento)
    `)
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function listarComandosDoDispositivo(dispositivoId: string): Promise<NeolocComando[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("neoloc_comandos").select("*").eq("dispositivo_id", dispositivoId).order("created_at", { ascending: false });
  return data ?? [];
}

export async function listarEventosDoDispositivo(dispositivoId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("neoloc_eventos")
    .select("*, usuario:usuarios(nome)")
    .eq("dispositivo_id", dispositivoId)
    .order("created_at", { ascending: false })
    .limit(50);
  return data ?? [];
}

export async function buscarConfiguracao(): Promise<NeolocConfiguracao | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: perfil } = await supabase.from("usuarios").select("loja_id").eq("id", user.id).single();
  if (!perfil) return null;
  const { data } = await supabase.from("neoloc_configuracoes").select("*").eq("loja_id", perfil.loja_id).maybeSingle();
  return data;
}

/**
 * Aparelhos vinculados a um contrato de locação (via crediario) que ainda
 * não têm dispositivo NeoLoc cadastrado — pra tela de "cadastrar
 * dispositivo". `aparelhos` e `contratos` têm FK nos dois sentidos
 * (contratos.aparelho_id e aparelhos.contrato_crediario_atual_id), então
 * o join é feito manualmente em vez de aninhado — evita ambiguidade de
 * relacionamento no PostgREST.
 */
export async function listarAparelhosSemDispositivoNeoLoc() {
  const supabase = await createClient();
  const { data: aparelhos } = await supabase
    .from("aparelhos")
    .select("id, imei, numero_serie, cor, status_crediario, contrato_crediario_atual_id, produto:produtos(nome)")
    .eq("status_crediario", "em_locacao")
    .order("data_entrada", { ascending: false });

  const { data: jaVinculados } = await supabase.from("neoloc_dispositivos").select("aparelho_id");
  const idsVinculados = new Set((jaVinculados ?? []).map((v) => v.aparelho_id));
  const disponiveis = (aparelhos ?? []).filter((a) => !idsVinculados.has(a.id));

  const contratoIds = disponiveis.map((a) => a.contrato_crediario_atual_id).filter(Boolean) as string[];
  const contratosPorId = new Map<string, { id: string; numero: string; cliente_nome: string | null }>();
  if (contratoIds.length > 0) {
    const { data: contratos } = await supabase.from("contratos").select("id, numero, cliente:clientes(nome)").in("id", contratoIds);
    for (const c of contratos ?? []) {
      const cliente = c.cliente as unknown as { nome: string } | null;
      contratosPorId.set(c.id, { id: c.id, numero: c.numero, cliente_nome: cliente?.nome ?? null });
    }
  }

  return disponiveis.map((a) => {
    const produto = a.produto as unknown as { nome: string } | null;
    return {
      id: a.id,
      imei: a.imei,
      numero_serie: a.numero_serie,
      cor: a.cor,
      produto,
      contrato: a.contrato_crediario_atual_id ? contratosPorId.get(a.contrato_crediario_atual_id) ?? null : null,
    };
  });
}
