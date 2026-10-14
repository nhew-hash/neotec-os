import { describe, it, expect } from "vitest";
import { classificarObjecao, gerarSugestao, interpretarRetomada, resultadoDoAcompanhamento, type ContextoConversa, type MensagemResumo } from "../sugestoes-comerciais";
import { dentroDaJanelaDeEnvio } from "@/services/whatsapp/trava-envio";

const H = 3_600_000;
const AGORA = new Date("2026-10-12T17:00:00Z"); // segunda 14h Brasília
const iso = (horasAtras: number) => new Date(AGORA.getTime() - horasAtras * H).toISOString();
const entrada = (conteudo: string, horasAtras: number): MensagemResumo => ({ direcao: "entrada", conteudo, criadoEm: iso(horasAtras) });
const saida = (conteudo: string, horasAtras: number): MensagemResumo => ({ direcao: "saida", conteudo, criadoEm: iso(horasAtras) });

function ctx(mensagens: MensagemResumo[], extra: Partial<ContextoConversa> = {}): ContextoConversa {
  return { conversaId: "cv1", cardId: "cd1", clienteId: "cl1", responsavelId: "u1", clienteNome: "maria souza", naoContatar: false, iaPausada: true, mensagens, sugestoesAnteriores: [], ...extra };
}

describe("gerarSugestao", () => {
  it("pediu preço e ficou sem retorno -> prioridade 1", () => {
    const s = gerarSugestao(ctx([entrada("oi, qual o preço do iphone 15?", 3)]), AGORA)!;
    expect(s.tipo).toBe("pediu_preco");
    expect(s.prioridade).toBe(1);
    expect(s.mensagemSugerida).toContain("Maria");
    expect(s.motivo.length).toBeGreaterThan(10);
  });

  it("cliente aguardando sem ser preço", () => {
    expect(gerarSugestao(ctx([entrada("bom dia, vocês abrem sábado?", 2)]), AGORA)!.tipo).toBe("cliente_aguardando");
  });

  it("IA ativa tem 1 h antes de virar pendência; pausada, 15 min", () => {
    expect(gerarSugestao(ctx([entrada("quanto custa?", 0.5)], { iaPausada: false }), AGORA)).toBeNull();
    expect(gerarSugestao(ctx([entrada("quanto custa?", 0.5)], { iaPausada: true }), AGORA)!.tipo).toBe("pediu_preco");
  });

  it("não sugere se já respondemos depois do cliente (e é recente)", () => {
    expect(gerarSugestao(ctx([entrada("quanto custa?", 5), saida("R$ 4.500", 4)]), AGORA)).toBeNull();
  });

  it("cliente parou depois da nossa mensagem (24h+)", () => {
    const s = gerarSugestao(ctx([entrada("tenho interesse no 15", 80), saida("segue o orçamento", 30)]), AGORA)!;
    expect(s.tipo).toBe("cliente_parou");
    expect(s.prioridade).toBe(3);
  });

  it("cliente parou + temperatura quente sobe a prioridade", () => {
    expect(gerarSugestao(ctx([entrada("quero", 80), saida("orçamento", 30)], { temperatura: "quente" }), AGORA)!.prioridade).toBe(1);
  });

  it("objeções classificadas", () => {
    expect(classificarObjecao("achei muito caro")).toBe("objecao_preco");
    expect(classificarObjecao("faz em 10x sem juros?")).toBe("objecao_parcelamento");
    expect(classificarObjecao("vi mais barato em outra loja")).toBe("objecao_concorrencia");
    expect(classificarObjecao("isso é original? tem nota fiscal?")).toBe("objecao_confianca");
    expect(classificarObjecao("aceita o meu aparelho na troca?")).toBe("objecao_troca");
    expect(classificarObjecao("bom dia")).toBeNull();
  });

  it("objeção de preço menciona a gerente e não promete desconto", () => {
    const s = gerarSugestao(ctx([entrada("achei caro, faz desconto?", 2)]), AGORA)!;
    expect(s.tipo).toBe("objecao_preco");
    expect(s.motivo).toContain("gerente");
    expect(s.mensagemSugerida).not.toMatch(/\d+\s?%|R\$/);
  });

  it("perto de fechar tem prioridade máxima", () => {
    const s = gerarSugestao(ctx([entrada("pode separar pra mim, vou passar aí amanhã", 1)]), AGORA)!;
    expect(s.tipo).toBe("perto_de_fechar");
    expect(s.prioridade).toBe(1);
  });

  it("'amanhã' agenda retomada no próximo horário útil", () => {
    const s = gerarSugestao(ctx([entrada("me chama amanhã que eu vejo", 1)]), AGORA)!;
    expect(s.tipo).toBe("retomar_depois");
    expect(s.horarioRecomendado.getTime()).toBeGreaterThan(AGORA.getTime());
    expect(dentroDaJanelaDeEnvio(s.horarioRecomendado)).toBe(true);
  });

  it("horário recomendado nunca cai fora da janela (sugestão às 21h vai para o dia seguinte)", () => {
    const noite = new Date("2026-10-13T00:30:00Z"); // segunda 21h30 Brasília
    const msgs: MensagemResumo[] = [{ direcao: "entrada", conteudo: "quanto custa o 15?", criadoEm: new Date(noite.getTime() - 2 * H).toISOString() }];
    const s = gerarSugestao(ctx(msgs), noite)!;
    expect(dentroDaJanelaDeEnvio(s.horarioRecomendado)).toBe(true);
    expect(s.horarioRecomendado.getTime()).toBeGreaterThan(noite.getTime());
  });

  it("não sugere para quem pediu para não ser contatado nem para card perdido", () => {
    expect(gerarSugestao(ctx([entrada("quanto custa?", 3)], { naoContatar: true }), AGORA)).toBeNull();
    expect(gerarSugestao(ctx([entrada("quanto custa?", 3)], { cardPerdido: true }), AGORA)).toBeNull();
  });

  it("não empilha: sugestão em aberto ou adiada ainda no futuro bloqueia nova", () => {
    const base = [entrada("quanto custa?", 3)];
    expect(gerarSugestao(ctx(base, { sugestoesAnteriores: [{ tipo: "pediu_preco", status: "sugerida", criadoEm: iso(1) }] }), AGORA)).toBeNull();
    expect(gerarSugestao(ctx(base, { sugestoesAnteriores: [{ tipo: "pediu_preco", status: "adiada", criadoEm: iso(5), adiadaAte: new Date(AGORA.getTime() + H).toISOString() }] }), AGORA)).toBeNull();
    expect(gerarSugestao(ctx(base, { sugestoesAnteriores: [{ tipo: "pediu_preco", status: "adiada", criadoEm: iso(30), adiadaAte: iso(1) }] }), AGORA)).not.toBeNull();
  });

  it("intervalo mínimo de 24h após uma sugestão enviada", () => {
    expect(gerarSugestao(ctx([entrada("quanto custa?", 3)], { sugestoesAnteriores: [{ tipo: "pediu_preco", status: "enviada", criadoEm: iso(10) }] }), AGORA)).toBeNull();
  });

  it("limite de insistência: 2 envios sem resposta -> para", () => {
    const anteriores = [
      { tipo: "cliente_parou", status: "enviada" as const, criadoEm: iso(24 * 9) },
      { tipo: "cliente_parou", status: "enviada" as const, criadoEm: iso(24 * 5) },
    ];
    const msgs = [entrada("tenho interesse", 24 * 12), saida("oi", 24 * 5)];
    expect(gerarSugestao(ctx(msgs, { sugestoesAnteriores: anteriores }), AGORA)).toBeNull();
  });

  it("mesma situação gera a mesma chave (dedupe), situação nova gera chave nova", () => {
    const a = gerarSugestao(ctx([entrada("quanto custa?", 3)]), AGORA)!;
    const b = gerarSugestao(ctx([entrada("quanto custa?", 3)]), new Date(AGORA.getTime() + H))!;
    expect(a.chaveDedupe).toBe(b.chaveDedupe);
    const c = gerarSugestao(ctx([entrada("quanto custa o 16?", 2)]), AGORA)!;
    expect(c.chaveDedupe).not.toBe(a.chaveDedupe);
  });

  it("conversa sem mensagens não gera nada", () => {
    expect(gerarSugestao(ctx([]), AGORA)).toBeNull();
  });
});

describe("interpretarRetomada", () => {
  it("reconhece expressões e devolve horário dentro da janela", () => {
    for (const frase of ["amanhã eu te falo", "semana que vem eu vejo", "vou pensar", "mais tarde te chamo"]) {
      const r = interpretarRetomada(frase, AGORA);
      expect(r, frase).not.toBeNull();
      expect(dentroDaJanelaDeEnvio(r!), frase).toBe(true);
    }
    expect(interpretarRetomada("quanto custa?", AGORA)).toBeNull();
  });
  it("sexta à noite 'amanhã' (sábado) cai em sábado útil; sábado 'amanhã' (domingo) vai para segunda", () => {
    const sabado = new Date("2026-10-17T15:00:00Z"); // sábado 12h
    const r = interpretarRetomada("amanhã", sabado)!;
    expect(r.getTime()).toBeGreaterThan(sabado.getTime());
    expect(dentroDaJanelaDeEnvio(r)).toBe(true);
  });
});

describe("resultadoDoAcompanhamento", () => {
  const enviada = iso(60);
  it("respondeu se houve mensagem do cliente depois", () => {
    expect(resultadoDoAcompanhamento(enviada, [entrada("oi", 10)], AGORA)).toBe("respondeu");
  });
  it("sem resposta após 48h", () => {
    expect(resultadoDoAcompanhamento(enviada, [], AGORA)).toBe("sem_resposta");
  });
  it("ainda indefinido antes de 48h", () => {
    expect(resultadoDoAcompanhamento(iso(10), [], AGORA)).toBeNull();
  });
});
