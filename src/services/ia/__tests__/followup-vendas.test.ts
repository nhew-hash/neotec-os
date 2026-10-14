import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const enviar = vi.fn();
let estado: {
  config: unknown; cards: unknown[]; conversa: unknown; ultimoAuto: unknown; casLinhas: unknown[]; updates: { tabela: string; valores: Record<string, unknown> }[];
};

function builder(tabela: string) {
  let op: "select" | "update" = "select";
  let valores: Record<string, unknown> = {};
  let comSelectAposUpdate = false;
  const b: Record<string, unknown> = {};
  const encadear = () => b;
  for (const m of ["eq", "not", "lt", "order", "limit", "is"]) b[m] = encadear;
  b.select = () => { if (op === "update") comSelectAposUpdate = true; return b; };
  b.update = (v: Record<string, unknown>) => { op = "update"; valores = v; estado.updates.push({ tabela, valores: v }); return b; };
  const resolver = () => {
    if (op === "update") return { data: comSelectAposUpdate ? estado.casLinhas : null, error: null };
    if (tabela === "configuracoes_ia") return { data: estado.config, error: null };
    if (tabela === "crm_cards") return { data: estado.cards, error: null };
    if (tabela === "whatsapp_conversas") return { data: estado.conversa, error: null };
    if (tabela === "whatsapp_mensagens") return { data: estado.ultimoAuto, error: null };
    return { data: null, error: null };
  };
  b.maybeSingle = async () => {
    const r = resolver();
    if (tabela === "crm_cards") return { data: { resumo_ia: null }, error: null };
    return r;
  };
  b.then = (ok: (v: unknown) => unknown) => Promise.resolve(resolver()).then(ok);
  void valores;
  return b;
}

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: (t: string) => builder(t) }) }));
vi.mock("@/services/ia/ia.service", () => ({ executarPromptIA: vi.fn().mockRejectedValue(new Error("sem IA nos testes")) }));
vi.mock("@/services/whatsapp/whatsapp.service", () => ({ enviarMensagemIA: (...a: unknown[]) => enviar(...a) }));

import { processarFollowupsDeVenda } from "../followup-vendas.service";

const HORAS = 3_600_000;
const BASE = new Date("2026-10-12T13:00:00Z").getTime();
function card() {
  return { id: "c1", titulo: "iPhone 15", sequencia_followup: 0, ultima_resposta_cliente_em: new Date(BASE - 30 * HORAS).toISOString(), cliente_id: "x", cliente: { nome: "Ana Souza" } };
}

beforeEach(() => {
  enviar.mockReset();
  enviar.mockResolvedValue({});
  estado = {
    config: { ativo: true, atendimento_automatico_ativo: true },
    cards: [card()],
    conversa: { id: "v1", telefone: "5534999999999", jid_envio: null, ia_pausada: false, card_id: "c1", nao_contatar: false },
    ultimoAuto: null,
    casLinhas: [{ id: "c1" }],
    updates: [],
  };
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-12T13:00:00Z")); // segunda 10h Brasília
});
afterEach(() => vi.useRealTimers());

describe("processarFollowupsDeVenda — trava e idempotência", () => {
  it("envia uma vez em horário permitido", async () => {
    const r = await processarFollowupsDeVenda();
    expect(enviar).toHaveBeenCalledTimes(1);
    expect(r.enviados).toBe(1);
  });

  it("não envia fora do horário (20h)", async () => {
    vi.setSystemTime(new Date("2026-10-12T23:00:00Z"));
    const r = await processarFollowupsDeVenda();
    expect(enviar).not.toHaveBeenCalled();
    expect(r.bloqueados.fora_do_horario).toBe(1);
  });

  it("não envia no domingo", async () => {
    vi.setSystemTime(new Date("2026-10-18T15:00:00Z"));
    await processarFollowupsDeVenda();
    expect(enviar).not.toHaveBeenCalled();
  });

  it("não envia a quem pediu para não ser contatado e encerra a sequência", async () => {
    estado.conversa = { ...(estado.conversa as object), nao_contatar: true };
    const r = await processarFollowupsDeVenda();
    expect(enviar).not.toHaveBeenCalled();
    expect(r.bloqueados.nao_contatar).toBe(1);
    expect(estado.updates.some((u) => u.tabela === "crm_cards" && u.valores.status_recuperacao === "sem_retorno")).toBe(true);
  });

  it("respeita o intervalo mínimo de 24h entre automáticas", async () => {
    estado.ultimoAuto = { criado_em: new Date(BASE - 2 * HORAS).toISOString() };
    const r = await processarFollowupsDeVenda();
    expect(enviar).not.toHaveBeenCalled();
    expect(r.bloqueados.intervalo_minimo).toBe(1);
  });

  it("idempotência: se outra execução já reservou a etapa, não envia", async () => {
    estado.casLinhas = [];
    const r = await processarFollowupsDeVenda();
    expect(enviar).not.toHaveBeenCalled();
    expect(r.bloqueados.ja_processado).toBe(1);
  });

  it("falha no envio devolve a etapa para nova tentativa", async () => {
    enviar.mockRejectedValueOnce(new Error("bridge fora"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await processarFollowupsDeVenda();
    errSpy.mockRestore();
    expect(r.enviados).toBe(0);
    expect(r.bloqueados.falha_envio).toBe(1);
    const reversao = estado.updates.filter((u) => u.tabela === "crm_cards" && u.valores.sequencia_followup === 0);
    expect(reversao.length).toBe(1);
  });

  it("IA desligada: não processa nada", async () => {
    estado.config = { ativo: false };
    const r = await processarFollowupsDeVenda();
    expect(r.processados).toBe(0);
    expect(enviar).not.toHaveBeenCalled();
  });
});
