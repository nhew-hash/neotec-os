import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Ator, ProdutoAchadinho } from "@/lib/achadinhos/tipos";
import { FERRAMENTAS, executarFerramenta, type ResultadoFerramenta } from "../achadinhos.operacoes";
import { criarRepoMemoria } from "./repo-memoria";

const LINK = "https://meli.la/2AbCdEf";
const claude = (escopos: Ator["escopos"] = ["leitura", "escrita", "status", "excluir"]): Ator => ({
  tipo: "claude", nome: "Chave teste", id: "chave-1", escopos,
});
const usuario: Ator = { tipo: "usuario", nome: "Nhew", id: "user-1", escopos: ["leitura", "escrita", "status"] };

function dadosDe(r: ResultadoFerramenta) {
  if (!r.ok) throw new Error(`esperava sucesso, veio ${r.codigo}: ${r.erro}`);
  return r.dados as Record<string, any>;
}
function erroDe(r: ResultadoFerramenta) {
  if (r.ok) throw new Error("esperava falha, veio sucesso");
  return r;
}

describe("achadinhos.operacoes", () => {
  let mem: ReturnType<typeof criarRepoMemoria>;
  beforeEach(() => {
    mem = criarRepoMemoria();
  });
  const exec = (nome: string, args: unknown, ator: Ator = claude()) => executarFerramenta(nome, args, ator, mem.repo);

  describe("create_product", () => {
    it("o Claude cria SEMPRE como rascunho, e não consegue passar status", async () => {
      const r = await exec("create_product", { nome: "Fone JBL Tune 510BT", link_afiliado: LINK });
      expect(dadosDe(r).status).toBe("rascunho");
      expect(dadosDe(r).slug).toBe("fone-jbl-tune-510bt");

      const tentativa = erroDe(await exec("create_product", { nome: "Outro", link_afiliado: LINK, status: "ativo" }));
      expect(tentativa.codigo).toBe("invalido");
      expect(tentativa.erro).toMatch(/status/);
      expect(mem.produtos).toHaveLength(1);
    });

    it("pessoa logada no painel pode escolher o status inicial", async () => {
      const r = await exec("create_product", { nome: "Cabo USB-C", link_afiliado: LINK, status: "ativo" }, usuario);
      expect(dadosDe(r).status).toBe("ativo");
    });

    it("gera slug a partir do nome e resolve colisão com sufixo", async () => {
      await exec("create_product", { nome: "Cabo USB-C", link_afiliado: LINK });
      const segundo = dadosDe(await exec("create_product", { nome: "Cabo USB-C", link_afiliado: LINK }));
      const terceiro = dadosDe(await exec("create_product", { nome: "Cabo USB-C", link_afiliado: LINK }));
      expect(segundo.slug).toBe("cabo-usb-c-2");
      expect(terceiro.slug).toBe("cabo-usb-c-3");
    });

    it("recusa slug explícito que já existe", async () => {
      await exec("create_product", { nome: "Alfa", slug: "meu-slug", link_afiliado: LINK });
      const r = erroDe(await exec("create_product", { nome: "Beta", slug: "meu-slug", link_afiliado: LINK }));
      expect(r.codigo).toBe("conflito");
    });

    it.each([
      ["domínio fora da lista", "https://evil.com/mercadolivre.com.br"],
      ["host que só termina parecido", "https://mercadolivre.com.br.evil.com/x"],
      ["http sem TLS", "http://www.mercadolivre.com.br/x"],
      ["esquema perigoso", "javascript:alert(1)"],
      ["credenciais na URL", "https://user:senha@mercadolivre.com.br/x"],
      ["texto qualquer", "meli.la/abc"],
    ])("recusa link de afiliado inválido: %s", async (_motivo, link) => {
      const r = erroDe(await exec("create_product", { nome: "Produto", link_afiliado: link }));
      expect(r.codigo).toBe("invalido");
      expect(mem.produtos).toHaveLength(0);
    });

    it("aceita os domínios do Mercado Livre (inclusive subdomínios)", async () => {
      for (const link of ["https://www.mercadolivre.com.br/p/MLB123", "https://produto.mercadolivre.com.br/MLB-1", "https://meli.la/abc"]) {
        const r = await exec("create_product", { nome: `P ${link}`, link_afiliado: link });
        expect(r.ok).toBe(true);
      }
    });

    it("não aceita desconto falso: preço anterior tem que ser maior que o atual", async () => {
      const igual = erroDe(await exec("create_product", { nome: "Produto Teste", link_afiliado: LINK, preco_atual: 100, preco_anterior: 100 }));
      expect(igual.erro).toMatch(/maior/);
      const menor = erroDe(await exec("create_product", { nome: "Produto Teste", link_afiliado: LINK, preco_atual: 100, preco_anterior: 80 }));
      expect(menor.codigo).toBe("invalido");
      const semAtual = erroDe(await exec("create_product", { nome: "Produto Teste", link_afiliado: LINK, preco_anterior: 80 }));
      expect(semAtual.codigo).toBe("invalido");
    });

    it("desconto informado precisa bater com os preços", async () => {
      const errado = erroDe(await exec("create_product", { nome: "Produto Teste", link_afiliado: LINK, preco_atual: 70, preco_anterior: 100, desconto_percentual: 50 }));
      expect(errado.erro).toMatch(/não bate/);
      const certo = await exec("create_product", { nome: "Produto Teste", link_afiliado: LINK, preco_atual: 70, preco_anterior: 100, desconto_percentual: 30 });
      expect(certo.ok).toBe(true);
    });

    it("rejeita campos desconhecidos em vez de ignorar em silêncio (ex.: tentar gravar cliques/comissão)", async () => {
      const r = erroDe(await exec("create_product", { nome: "Produto Teste", link_afiliado: LINK, cliques: 999, comissao: 50 }));
      expect(r.erro).toMatch(/cliques/);
    });

    it("não inventa nada: campos não informados ficam vazios", async () => {
      const p = dadosDe(await exec("create_product", { nome: "Produto simples", link_afiliado: LINK }));
      expect(p.preco_atual).toBeNull();
      expect(p.preco_anterior).toBeNull();
      expect(p.desconto_percentual).toBeNull();
      expect(p.descricao).toBeNull();
      expect(p.informacoes).toEqual([]);
      expect(p.cliques).toBe(0);
    });

    it("normaliza tags (minúsculas, sem repetição)", async () => {
      const p = dadosDe(await exec("create_product", { nome: "Produto Teste", link_afiliado: LINK, tags: ["Fone", "fone", "Bluetooth"] }));
      expect(p.tags).toEqual(["fone", "bluetooth"]);
    });
  });

  describe("update_product", () => {
    async function criarBase() {
      return dadosDe(await exec("create_product", { nome: "Fone", link_afiliado: LINK, preco_atual: 100 })) as ProdutoAchadinho;
    }

    it("atualiza só os campos enviados e registra o que mudou", async () => {
      const base = await criarBase();
      const r = await exec("update_product", { id: base.id, preco_atual: 90, categoria: "Fones" });
      expect(dadosDe(r).preco_atual).toBe(90);
      expect(dadosDe(r).nome).toBe("Fone");
      const log = mem.logs.at(-1)!;
      expect(log.operacao).toBe("update_product");
      expect((log.detalhe as any).campos.sort()).toEqual(["categoria", "preco_atual"]);
      expect((log.detalhe as any).antes.preco_atual).toBe(100);
    });

    it("aceita slug como identificador", async () => {
      const base = await criarBase();
      const r = await exec("update_product", { slug: base.slug, selo: "Em alta" });
      expect(dadosDe(r).selo).toBe("Em alta");
    });

    it("valida a coerência de preço contra o que JÁ está no banco", async () => {
      const base = await criarBase(); // preco_atual 100
      const r = erroDe(await exec("update_product", { id: base.id, preco_anterior: 90 }));
      expect(r.codigo).toBe("invalido");
      const ok = await exec("update_product", { id: base.id, preco_anterior: 130 });
      expect(ok.ok).toBe(true);
    });

    it("mudar só o preço atual com desconto informado exige atualizar o desconto junto", async () => {
      const base = dadosDe(await exec("create_product", { nome: "Produto X", link_afiliado: LINK, preco_atual: 70, preco_anterior: 100, desconto_percentual: 30 })) as ProdutoAchadinho;
      const r = erroDe(await exec("update_product", { id: base.id, preco_atual: 50 }));
      expect(r.erro).toMatch(/desconto/i);
      const junto = await exec("update_product", { id: base.id, preco_atual: 50, desconto_percentual: 50 });
      expect(junto.ok).toBe(true);
    });

    it("não deixa editar campos de sistema/performance nem trocar o slug", async () => {
      const base = await criarBase();
      expect(erroDe(await exec("update_product", { id: base.id, cliques: 5000 })).codigo).toBe("invalido");
      expect(erroDe(await exec("update_product", { id: base.id, receita: 1000 })).codigo).toBe("invalido");
      expect(erroDe(await exec("update_product", { id: base.id, status: "ativo" })).codigo).toBe("invalido");
      expect(mem.produtos[0].cliques).toBe(0);
      expect(mem.produtos[0].status).toBe("rascunho");
    });

    it("sem nenhum campo para mudar → erro claro; valores iguais → sem alteração", async () => {
      const base = await criarBase();
      expect(erroDe(await exec("update_product", { id: base.id })).erro).toMatch(/Nenhum campo/);
      const igual = await exec("update_product", { id: base.id, preco_atual: 100 });
      expect(igual.ok && igual.mensagem).toMatch(/Nenhuma alteração/);
    });

    it("null limpa um campo", async () => {
      const base = dadosDe(await exec("create_product", { nome: "Produto X", link_afiliado: LINK, selo: "Novo" })) as ProdutoAchadinho;
      const r = await exec("update_product", { id: base.id, selo: null });
      expect(dadosDe(r).selo).toBeNull();
    });

    it("produto inexistente → nao_encontrado", async () => {
      const r = erroDe(await exec("update_product", { id: "0b8c1d6a-8b2f-4c58-9d61-0c2e8c1f3a77", nome: "Zeta Produto" }));
      expect(r.codigo).toBe("nao_encontrado");
    });
  });

  describe("status: activate / pause / archive", () => {
    it("ciclo completo e idempotência", async () => {
      const p = dadosDe(await exec("create_product", { nome: "Fone", link_afiliado: LINK }));
      expect(dadosDe(await exec("activate_product", { slug: p.slug })).status).toBe("ativo");
      const denovo = await exec("activate_product", { slug: p.slug });
      expect(denovo.ok && denovo.mensagem).toMatch(/já estava/);
      expect(dadosDe(await exec("pause_product", { slug: p.slug })).status).toBe("pausado");
      expect(dadosDe(await exec("archive_product", { slug: p.slug })).status).toBe("arquivado");
      expect(dadosDe(await exec("activate_product", { slug: p.slug })).status).toBe("ativo");
    });

    it("não ativa produto com link fora dos domínios permitidos (ex.: banco adulterado)", async () => {
      const p = dadosDe(await exec("create_product", { nome: "Fone", link_afiliado: LINK }));
      mem.produtos[0].link_afiliado = "https://golpe.com/x";
      const r = erroDe(await exec("activate_product", { id: p.id }));
      expect(r.codigo).toBe("invalido");
      expect(mem.produtos[0].status).toBe("rascunho");
    });

    it("ativar exige o escopo 'status' (escrita sozinha não basta)", async () => {
      const p = dadosDe(await exec("create_product", { nome: "Fone", link_afiliado: LINK }));
      const r = erroDe(await exec("activate_product", { id: p.id }, claude(["leitura", "escrita"])));
      expect(r.codigo).toBe("nao_autorizado");
      expect(mem.produtos[0].status).toBe("rascunho");
    });

    it("pedir revalidação das páginas ao mudar de status", async () => {
      const p = dadosDe(await exec("create_product", { nome: "Fone", link_afiliado: LINK }));
      const r = await exec("activate_product", { id: p.id });
      expect(r.ok && r.revalidar).toContain("/achadinhos");
      expect(r.ok && r.revalidar).toContain(`/achadinhos/${p.slug}`);
    });
  });

  describe("delete_product (protegido)", () => {
    async function criarAtivo() {
      const p = dadosDe(await exec("create_product", { nome: "Fone", link_afiliado: LINK })) as ProdutoAchadinho;
      await exec("activate_product", { id: p.id });
      return p;
    }

    it("sem confirmação, NÃO exclui — e diz exatamente o que precisa ser enviado", async () => {
      const p = await criarAtivo();
      const r = erroDe(await exec("delete_product", { id: p.id }));
      expect(r.codigo).toBe("confirmacao_necessaria");
      expect(r.erro).toContain(`EXCLUIR ${p.slug}`);
      expect(mem.produtos[0].excluido_em).toBeNull();
      expect(mem.produtos[0].status).toBe("ativo");
    });

    it("confirmação de OUTRO produto não vale", async () => {
      const p = await criarAtivo();
      const r = erroDe(await exec("delete_product", { id: p.id, confirmacao: "EXCLUIR outro-produto" }));
      expect(r.codigo).toBe("confirmacao_necessaria");
      expect(mem.produtos[0].excluido_em).toBeNull();
    });

    it("com a confirmação correta: exclusão LÓGICA (registro e histórico permanecem)", async () => {
      const p = await criarAtivo();
      const r = await exec("delete_product", { id: p.id, confirmacao: `EXCLUIR ${p.slug}` });
      expect(r.ok).toBe(true);
      expect(mem.produtos).toHaveLength(1); // nada de DELETE físico
      expect(mem.produtos[0].excluido_em).not.toBeNull();
      expect(mem.produtos[0].status).toBe("arquivado");
      expect(mem.produtos[0].destaque).toBe(false);
    });

    it("produto excluído some das listagens normais e não aceita mais operações", async () => {
      const p = await criarAtivo();
      await exec("delete_product", { id: p.id, confirmacao: `EXCLUIR ${p.slug}` });
      expect(dadosDe(await exec("list_products", {})).quantidade).toBe(0);
      expect(dadosDe(await exec("list_products", { incluir_excluidos: true })).quantidade).toBe(1);
      expect(erroDe(await exec("activate_product", { id: p.id })).codigo).toBe("nao_encontrado");
      expect(erroDe(await exec("update_product", { id: p.id, nome: "Novo nome" })).codigo).toBe("nao_encontrado");
      expect(erroDe(await exec("delete_product", { id: p.id, confirmacao: `EXCLUIR ${p.slug}` })).codigo).toBe("nao_encontrado");
    });

    it("o slug de um produto excluído continua reservado", async () => {
      const p = await criarAtivo();
      await exec("delete_product", { id: p.id, confirmacao: `EXCLUIR ${p.slug}` });
      const novo = dadosDe(await exec("create_product", { nome: "Fone", link_afiliado: LINK }));
      expect(novo.slug).not.toBe(p.slug);
    });

    it("exige o escopo 'excluir'", async () => {
      const p = await criarAtivo();
      const r = erroDe(await exec("delete_product", { id: p.id, confirmacao: `EXCLUIR ${p.slug}` }, claude(["leitura", "escrita", "status"])));
      expect(r.codigo).toBe("nao_autorizado");
      expect(mem.produtos[0].excluido_em).toBeNull();
    });
  });

  describe("leitura", () => {
    it("get_product devolve o produto completo com a URL pública", async () => {
      const p = dadosDe(await exec("create_product", { nome: "Fone", link_afiliado: LINK }));
      const r = dadosDe(await exec("get_product", { slug: p.slug }));
      expect(r.id).toBe(p.id);
      expect(r.url_publica).toMatch(/\/achadinhos\/fone$/);
      expect(r).not.toHaveProperty("loja_id");
    });

    it("list_products filtra por status/busca e valida o limite", async () => {
      const a = dadosDe(await exec("create_product", { nome: "Fone JBL", categoria: "Fones", link_afiliado: LINK }));
      await exec("create_product", { nome: "Carregador", categoria: "Carregadores", link_afiliado: LINK });
      await exec("activate_product", { id: a.id });
      expect(dadosDe(await exec("list_products", { status: "ativo" })).quantidade).toBe(1);
      expect(dadosDe(await exec("list_products", { busca: "carreg" })).quantidade).toBe(1);
      expect(dadosDe(await exec("list_products", { categoria: "Fones" })).quantidade).toBe(1);
      expect(erroDe(await exec("list_products", { limite: 5000 })).codigo).toBe("invalido");
    });

    it("get_catalog_summary conta por status, destaques, excluídos e ranqueia por cliques", async () => {
      const ids: string[] = [];
      for (const nome of ["Alfa", "Beta", "Gama", "Delta", "Eco"]) {
        ids.push(dadosDe(await exec("create_product", { nome, link_afiliado: LINK })).id);
      }
      await exec("activate_product", { id: ids[0] });
      await exec("activate_product", { id: ids[1] });
      await exec("pause_product", { id: ids[2] });
      await exec("archive_product", { id: ids[3] });
      await exec("update_product", { id: ids[0], destaque: true });
      await exec("update_product", { id: ids[2], destaque: true }); // destaque, mas pausado: não conta
      await exec("delete_product", { id: ids[4], confirmacao: "EXCLUIR eco" });
      mem.produtos.find((p) => p.id === ids[1])!.cliques = 40;
      mem.produtos.find((p) => p.id === ids[0])!.cliques = 7;

      const s = dadosDe(await exec("get_catalog_summary", {}));
      expect(s).toMatchObject({ total: 4, ativos: 2, pausados: 1, arquivados: 1, rascunhos: 0, destaques: 1, excluidos: 1, cliques_total: 47 });
      expect(s.mais_clicados.map((x: any) => x.slug)).toEqual(["beta", "alfa"]);
    });

    it("leitura funciona só com o escopo 'leitura'", async () => {
      const r = await exec("list_products", {}, claude(["leitura"]));
      expect(r.ok).toBe(true);
    });
  });

  describe("autorização e auditoria", () => {
    it("chave sem escopo é negada e a negativa vai pro log", async () => {
      const r = erroDe(await exec("create_product", { nome: "Produto Teste", link_afiliado: LINK }, claude(["leitura"])));
      expect(r.codigo).toBe("nao_autorizado");
      expect(mem.produtos).toHaveLength(0);
      expect(mem.logs.at(-1)).toMatchObject({ operacao: "create_product", resultado: "negado", ator: { tipo: "claude", nome: "Chave teste" } });
    });

    it("toda operação gera log com quem, o quê, qual produto e resultado", async () => {
      const p = dadosDe(await exec("create_product", { nome: "Fone", link_afiliado: LINK }));
      await exec("pause_product", { id: p.id });
      await exec("update_product", { id: "0b8c1d6a-8b2f-4c58-9d61-0c2e8c1f3a77", nome: "Produto X" });
      expect(mem.logs.map((l) => [l.operacao, l.resultado])).toEqual([
        ["create_product", "sucesso"],
        ["pause_product", "sucesso"],
        ["update_product", "erro"],
      ]);
      expect(mem.logs[0]).toMatchObject({ produto_id: p.id, produto_nome: "Fone", ator: { tipo: "claude" } });
    });

    it("falha ao gravar o log não derruba a operação", async () => {
      const erro = vi.spyOn(console, "error").mockImplementation(() => {});
      mem.falhas.log = true;
      const r = await exec("create_product", { nome: "Fone", link_afiliado: LINK });
      expect(r.ok).toBe(true);
      expect(mem.produtos).toHaveLength(1);
      expect(erro).toHaveBeenCalled();
      erro.mockRestore();
    });

    it("ferramenta inexistente é recusada", async () => {
      expect(erroDe(await exec("drop_table", {})).codigo).toBe("ferramenta_desconhecida");
    });

    it("erro inesperado não vaza detalhe interno na resposta", async () => {
      const erro = vi.spyOn(console, "error").mockImplementation(() => {});
      mem.repo.listar = async () => { throw new Error("connection refused 10.0.0.5:5432"); };
      const r = erroDe(await exec("list_products", {}));
      expect(r.codigo).toBe("erro");
      expect(r.erro).not.toMatch(/10\.0\.0\.5/);
      erro.mockRestore();
    });
  });

  describe("definição das ferramentas", () => {
    it("expõe as 9 ferramentas do briefing + as 6 da fábrica, cada uma com escopo e schema", () => {
      expect(FERRAMENTAS.map((f) => f.nome).sort()).toEqual([
        "activate_product", "archive_product", "create_product", "delete_product", "get_catalog_summary",
        "get_click_stats", "get_product", "list_candidates", "list_products", "pause_product", "record_price", "record_sales",
        "set_candidate_status",
        "update_product", "upsert_candidates",
      ]);
      for (const f of FERRAMENTAS) {
        expect(f.entrada.type).toBe("object");
        expect(f.descricao.length).toBeGreaterThan(20);
      }
      expect(FERRAMENTAS.find((f) => f.nome === "delete_product")!.escopo).toBe("excluir");
    });
  });

  describe("fábrica (fase 264)", () => {
    const cand = (id: string, extra: Record<string, unknown> = {}) => ({
      ml_catalog_id: id, nome: `Produto ${id}`, preco: 49.9, fotos: ["https://http2.mlstatic.com/a.jpg"], ...extra,
    });

    it("list_products devolve o score e a classe de mídia no resumo", async () => {
      await exec("create_product", { nome: "Caneca", link_afiliado: LINK, score: 87, midia_classe: "B", ml_catalog_id: "mlb111" });
      const p = dadosDe(await exec("list_products", {})).produtos[0];
      expect(p.score).toBe(87);
      expect(p.midia_classe).toBe("B");
      expect(mem.produtos[0].ml_catalog_id).toBe("MLB111");
    });

    it("upsert_candidates: insere novos, atualiza existentes sem mexer no status e ignora o que já está no catálogo", async () => {
      await exec("create_product", { nome: "Já no catálogo", link_afiliado: LINK, ml_catalog_id: "MLB1" });
      const r1 = dadosDe(await exec("upsert_candidates", { candidatos: [cand("MLB1"), cand("MLB2"), cand("MLB3")] }));
      expect(r1.inseridos).toBe(2);
      expect(r1.ignorados).toEqual([expect.objectContaining({ ml_catalog_id: "MLB1", motivo: "já está no catálogo" })]);
      expect(mem.candidatos.every((c) => c.status === "ENCONTRADO")).toBe(true);

      const id2 = mem.candidatos.find((c) => c.ml_catalog_id === "MLB2")!.id;
      await exec("set_candidate_status", { id: id2, status: "SELECIONADO", product_score: 82, classe: "B" });
      const r2 = dadosDe(await exec("upsert_candidates", { candidatos: [cand("MLB2", { preco: 39.9 })] }));
      expect(r2.atualizados).toBe(1);
      const c2 = mem.candidatos.find((c) => c.id === id2)!;
      expect(c2.preco).toBe(39.9);
      expect(c2.status).toBe("SELECIONADO");
      expect(c2.product_score).toBe(82);
    });

    it("upsert_candidates recusa desconto falso e id inválido, item a item", async () => {
      const r = dadosDe(await exec("upsert_candidates", {
        candidatos: [cand("MLB5", { preco_anterior_oficial: 40 }), cand("xyz"), cand("MLB6", { preco_anterior_oficial: 79.9 }), cand("MLB6")],
      }));
      expect(r.inseridos).toBe(1);
      expect(r.ignorados.map((i: { motivo: string }) => i.motivo).join(" | ")).toMatch(/maior que o preço.*id do Mercado Livre inválido.*repetido/);
      expect(mem.candidatos[0].preco_anterior_oficial).toBe(79.9);
    });

    it("set_candidate_status valida descarte, link de afiliado e cadastro", async () => {
      await exec("upsert_candidates", { candidatos: [cand("MLB7")] });
      const id = mem.candidatos[0].id;
      expect(erroDe(await exec("set_candidate_status", { id, status: "DESCARTADO" })).erro).toMatch(/motivo_descarte/);
      expect(erroDe(await exec("set_candidate_status", { id, status: "LINK_OK" })).erro).toMatch(/link_afiliado/);
      expect(erroDe(await exec("set_candidate_status", { id, status: "LINK_OK", link_afiliado: "https://evil.com/x" })).codigo).toBe("invalido");
      expect(dadosDe(await exec("set_candidate_status", { id, status: "LINK_OK", link_afiliado: LINK })).link_afiliado).toBe(LINK);

      expect(erroDe(await exec("set_candidate_status", { id, status: "CADASTRADO" })).erro).toMatch(/produto_id/);
      const produto = dadosDe(await exec("create_product", { nome: "Produto MLB7", link_afiliado: LINK, ml_catalog_id: "MLB7" }));
      expect(dadosDe(await exec("set_candidate_status", { id, status: "CADASTRADO", produto_id: produto.id })).status).toBe("CADASTRADO");
      expect(erroDe(await exec("set_candidate_status", { id, status: "SELECIONADO" })).codigo).toBe("conflito");
    });

    it("set_candidate_status exige escopo de escrita", async () => {
      await exec("upsert_candidates", { candidatos: [cand("MLB8")] });
      const r = erroDe(await exec("set_candidate_status", { id: mem.candidatos[0].id, status: "ANALISANDO" }, claude(["leitura"])));
      expect(r.codigo).toBe("nao_autorizado");
    });

    it("list_candidates filtra por status e ordena por score", async () => {
      await exec("upsert_candidates", { candidatos: [cand("MLB10"), cand("MLB11"), cand("MLB12")] });
      const [a, b] = mem.candidatos;
      await exec("set_candidate_status", { id: a.id, status: "SELECIONADO", product_score: 60 });
      await exec("set_candidate_status", { id: b.id, status: "SELECIONADO", product_score: 90 });
      const r = dadosDe(await exec("list_candidates", { status: "SELECIONADO" }));
      expect(r.candidatos.map((c: { id: string }) => c.id)).toEqual([b.id, a.id]);
    });

    it("record_price: grava histórico, atualiza o preço e limpa desconto que não é oficial", async () => {
      await exec("create_product", { nome: "Fone", link_afiliado: LINK, preco_atual: 80, preco_anterior: 100, desconto_percentual: 20 });
      const igual = dadosDe(await exec("record_price", { slug: "fone", preco: 80, preco_anterior: 100 }));
      expect(igual.mudou).toBe(false);

      const r = dadosDe(await exec("record_price", { slug: "fone", preco: 75 }));
      expect(r.mudou).toBe(true);
      expect(mem.produtos[0]).toMatchObject({ preco_atual: 75, preco_anterior: null, desconto_percentual: null });
      expect(mem.precos).toHaveLength(2);

      const indisponivel = await exec("record_price", { slug: "fone", disponivel: false });
      expect(dadosDe(indisponivel).disponivel).toBe(false);
      expect(mem.produtos[0].status).toBe("rascunho");
      expect(mem.produtos[0].preco_atual).toBe(75);
      expect(erroDe(await exec("record_price", { slug: "fone" })).erro).toMatch(/preço/);
    });

    it("get_click_stats agrupa os cliques por conteúdo e produto", async () => {
      const agora = new Date().toISOString();
      mem.cliques.push(
        { produto_slug: "fone", utm_content: "c12", utm_campaign: "achadinhos", criado_em: agora },
        { produto_slug: "fone", utm_content: "c12", utm_campaign: "achadinhos", criado_em: agora },
        { produto_slug: "cabo", utm_content: null, utm_campaign: null, criado_em: agora },
        { produto_slug: "fone", utm_content: "c9", utm_campaign: "achadinhos", criado_em: "2020-01-01T00:00:00.000Z" },
      );
      const r = dadosDe(await exec("get_click_stats", { utm_campaign: "achadinhos" }));
      expect(r.total).toBe(2);
      expect(r.grupos).toEqual([expect.objectContaining({ utm_content: "c12", produto_slug: "fone", cliques: 2 })]);
      expect(erroDe(await exec("get_click_stats", { desde: "ontem" })).codigo).toBe("invalido");
    });

    it("record_sales grava os totais do relatório e só aceita números válidos", async () => {
      await exec("create_product", { nome: "Fone", link_afiliado: LINK });
      const r = dadosDe(await exec("record_sales", { slug: "fone", vendas: 7, comissao: 12.5, periodo: "2026-10" }));
      expect(r).toMatchObject({ vendas: 7, comissao: 12.5 });
      expect(mem.logs.at(-1)!.detalhe).toMatchObject({ periodo: "2026-10", campos: ["vendas", "comissao"] });
      expect(erroDe(await exec("record_sales", { slug: "fone", vendas: -1 })).codigo).toBe("invalido");
      expect(erroDe(await exec("record_sales", { slug: "fone", vendas: 1 }, claude(["leitura"]))).codigo).toBe("nao_autorizado");
    });
  });
});
