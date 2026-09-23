"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ChevronLeft, MessageCircle, Repeat, RotateCcw, Send, ShoppingBag, Store } from "lucide-react";
import {
  listarMarcasTradeInAction,
  listarFamiliasTradeInAction,
  listarVariantesTradeInAction,
  calcularEstimativaSiteAction,
  criarEstimativaSiteAction,
  escolherFormaCompraSiteAction,
} from "@/services/loja/trade-in-wizard.actions";
import { CHECKLIST_TRADE_IN } from "@/services/trade-in/checklist";
import { OPCOES_COMPRA_TROCA, type FormaCompraTroca } from "@/services/trade-in/como-funciona";
import { salvarTradeInPendente } from "@/services/loja/trade-in-pendente";
import { formatCurrency } from "@/utils";

const ICONE_FORMA: Record<FormaCompraTroca, typeof Send> = {
  pagamento_antecipado: ShoppingBag,
  enviar_aparelho: Send,
  presencial: Store,
};

const CONFIRMACAO_FORMA: Record<FormaCompraTroca, string> = {
  pagamento_antecipado: "Combinado! Agora é só escolher seu iPhone — o valor do seu aparelho já entra como um dos dois pagamentos no checkout.",
  enviar_aparelho: "Combinado! Nossa equipe vai te chamar no WhatsApp com o endereço pra envio do aparelho.",
  presencial: "Combinado! Te esperamos na loja com o aparelho — leva um documento também.",
};

// Perguntas simples do site — reaproveitam os MESMOS itens/códigos do
// checklist único do módulo (Fase 236), só um subconjunto reduzido do
// que o staff preenche fisicamente. Nenhuma pergunta nova foi inventada.
const IDS_CHECKLIST_SITE = ["tela_estado", "face_id", "camera_traseira", "sinais_abertura", "sinais_liquido"];
const PERGUNTAS_SITE = CHECKLIST_TRADE_IN.flatMap((g) => g.itens).filter((item) => IDS_CHECKLIST_SITE.includes(item.id));

const OPCOES_BATERIA = [
  { label: "Boa — dura o dia todo", saude: 95 },
  { label: "Média — perde carga mais rápido que antes", saude: 82 },
  { label: "Ruim — descarrega rápido ou desliga sozinho", saude: 65 },
  { label: "Não sei", saude: null as number | null },
];

type Etapa = "marca" | "familia" | "variante" | "checklist" | "bateria" | "resultado";

type Resposta = "ok" | "reprovado";

export function TradeInWizard() {
  const [etapa, setEtapa] = useState<Etapa>("marca");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [marcas, setMarcas] = useState<string[]>([]);
  const [marca, setMarca] = useState<string | null>(null);
  const [familias, setFamilias] = useState<string[]>([]);
  const [familia, setFamilia] = useState<string | null>(null);
  const [variantes, setVariantes] = useState<{ id: string; nome: string }[]>([]);
  const [variante, setVariante] = useState<{ id: string; nome: string } | null>(null);

  const [respostas, setRespostas] = useState<Record<string, Resposta>>({});
  const [bateriaSaude, setBateriaSaude] = useState<number | null>(null);

  const [resultado, setResultado] = useState<{ encontrado: boolean; valorEstimado?: number; bloqueado?: boolean; mensagem?: string } | null>(null);
  const [avaliacaoId, setAvaliacaoId] = useState<string | null>(null);
  const [usarNaCompra, setUsarNaCompra] = useState(false);

  const [formaAberta, setFormaAberta] = useState<FormaCompraTroca | null>(null);
  const [formaEscolhida, setFormaEscolhida] = useState<FormaCompraTroca | null>(null);
  const [contatoNome, setContatoNome] = useState("");
  const [contatoTelefone, setContatoTelefone] = useState("");

  useEffect(() => {
    setCarregando(true);
    listarMarcasTradeInAction().then((result) => {
      setCarregando(false);
      if (result.success) setMarcas(result.data);
      else setErro(result.error);
    });
  }, []);

  function escolherMarca(m: string) {
    setMarca(m);
    setCarregando(true);
    listarFamiliasTradeInAction(m).then((result) => {
      setCarregando(false);
      if (result.success) { setFamilias(result.data); setEtapa("familia"); }
      else setErro(result.error);
    });
  }

  function escolherFamilia(f: string) {
    setFamilia(f);
    setCarregando(true);
    listarVariantesTradeInAction(f).then((result) => {
      setCarregando(false);
      if (result.success) { setVariantes(result.data); setEtapa("variante"); }
      else setErro(result.error);
    });
  }

  function escolherVariante(v: { id: string; nome: string }) {
    setVariante(v);
    setEtapa("checklist");
  }

  function avancarParaBateria() {
    setEtapa("bateria");
  }

  function calcular() {
    if (!variante) return;
    setErro(null);
    setCarregando(true);
    const codigos = PERGUNTAS_SITE.filter((p) => respostas[p.id] === "reprovado").flatMap((p) => p.avariasSeReprovado);
    calcularEstimativaSiteAction({ modeloId: variante.id, avariasMarcadas: [...new Set(codigos)], bateriaSaude }).then((result) => {
      setCarregando(false);
      if (!result.success) return setErro(result.error);
      setResultado(result.data);
      setEtapa("resultado");
    });
  }

  function refazer() {
    setMarca(null); setFamilia(null); setVariante(null);
    setRespostas({}); setBateriaSaude(null); setResultado(null); setAvaliacaoId(null);
    setUsarNaCompra(false); setFormaAberta(null); setFormaEscolhida(null);
    setContatoNome(""); setContatoTelefone("");
    setEtapa("marca");
  }

  /** Cria a avaliação no banco (se ainda não criada) e devolve o id — chamado só quando o cliente decide seguir com uma das 3 formas de compra. */
  async function garantirAvaliacaoCriada(): Promise<string | null> {
    if (avaliacaoId) return avaliacaoId;
    if (!variante) return null;
    const codigos = PERGUNTAS_SITE.filter((p) => respostas[p.id] === "reprovado").flatMap((p) => p.avariasSeReprovado);
    const result = await criarEstimativaSiteAction({ modeloId: variante.id, avariasMarcadas: [...new Set(codigos)], bateriaSaude });
    if (result.success && "id" in result.data && result.data.id) {
      setAvaliacaoId(result.data.id);
      setUsarNaCompra(true);
      return result.data.id;
    }
    return null;
  }

  function handleConfirmarForma(forma: FormaCompraTroca) {
    setCarregando(true);
    setErro(null);
    garantirAvaliacaoCriada().then(async (id) => {
      if (!id) { setCarregando(false); return setErro("Não foi possível salvar sua estimativa agora — tenta de novo em instantes."); }
      const result = await escolherFormaCompraSiteAction({
        avaliacaoId: id, forma, clienteNome: contatoNome || undefined, clienteTelefone: contatoTelefone || undefined,
      });
      setCarregando(false);
      if (!result.success) return setErro(result.error);

      if (forma === "pagamento_antecipado" && variante && resultado?.valorEstimado != null) {
        salvarTradeInPendente({ avaliacaoId: id, modeloNome: variante.nome, valorEstimado: resultado.valorEstimado });
      }

      setFormaEscolhida(forma);
      setFormaAberta(null);
    });
  }

  const progresso: Record<Etapa, number> = { marca: 1, familia: 2, variante: 3, checklist: 4, bateria: 5, resultado: 6 };

  return (
    <div className="mx-auto max-w-lg px-4 py-14">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Repeat className="h-6 w-6" />
        </div>
        <h1 className="font-display text-section-title text-foreground">Avalie seu aparelho</h1>
        <p className="mt-2 text-sm text-muted-foreground">Responda algumas perguntas rápidas e veja uma estimativa de troca na hora.</p>
      </div>

      {etapa !== "marca" && etapa !== "resultado" && (
        <div className="mb-4 h-1 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full bg-primary transition-all" style={{ width: `${(progresso[etapa] / 5) * 100}%` }} />
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-black/[0.06] bg-[#FAFBFC] p-6">
        {erro && <p className="text-xs text-danger">{erro}</p>}

        {etapa === "marca" && (
          <>
            <p className="text-sm font-medium text-foreground">Qual a marca do seu aparelho?</p>
            {carregando && <p className="text-xs text-muted-foreground">Carregando...</p>}
            <div className="grid grid-cols-2 gap-2">
              {marcas.map((m) => (
                <button key={m} onClick={() => escolherMarca(m)} className="rounded-xl border border-black/[0.08] bg-white px-3.5 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary">
                  {m}
                </button>
              ))}
            </div>
            {!carregando && marcas.length === 0 && (
              <p className="text-xs text-muted-foreground">Ainda não temos modelos cadastrados pra avaliação automática — fala com a gente no WhatsApp.</p>
            )}
          </>
        )}

        {etapa === "familia" && (
          <>
            <VoltarBotao onClick={() => setEtapa("marca")} />
            <p className="text-sm font-medium text-foreground">Qual o modelo?</p>
            {carregando && <p className="text-xs text-muted-foreground">Carregando...</p>}
            <div className="flex flex-col gap-2">
              {familias.map((f) => (
                <button key={f} onClick={() => escolherFamilia(f)} className="rounded-xl border border-black/[0.08] bg-white px-3.5 py-3 text-left text-sm font-medium text-foreground transition-colors hover:border-primary">
                  {f}
                </button>
              ))}
            </div>
          </>
        )}

        {etapa === "variante" && (
          <>
            <VoltarBotao onClick={() => setEtapa("familia")} />
            <p className="text-sm font-medium text-foreground">Qual a versão/armazenamento?</p>
            {carregando && <p className="text-xs text-muted-foreground">Carregando...</p>}
            <div className="flex flex-col gap-2">
              {variantes.map((v) => (
                <button key={v.id} onClick={() => escolherVariante(v)} className="rounded-xl border border-black/[0.08] bg-white px-3.5 py-3 text-left text-sm font-medium text-foreground transition-colors hover:border-primary">
                  {v.nome}
                </button>
              ))}
            </div>
          </>
        )}

        {etapa === "checklist" && variante && (
          <>
            <VoltarBotao onClick={() => setEtapa("variante")} />
            <p className="text-sm font-medium text-foreground">{variante.nome} — algumas perguntas rápidas</p>
            <div className="flex flex-col gap-2">
              {PERGUNTAS_SITE.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 rounded-xl border border-black/[0.08] bg-white p-3">
                  <span className="text-sm text-foreground">{p.titulo}</span>
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      onClick={() => setRespostas((prev) => ({ ...prev, [p.id]: "ok" }))}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${respostas[p.id] === "ok" ? "bg-success text-white" : "bg-secondary text-muted-foreground"}`}
                    >Sim</button>
                    <button
                      onClick={() => setRespostas((prev) => ({ ...prev, [p.id]: "reprovado" }))}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${respostas[p.id] === "reprovado" ? "bg-danger text-white" : "bg-secondary text-muted-foreground"}`}
                    >Não</button>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={avancarParaBateria}
              disabled={PERGUNTAS_SITE.some((p) => !respostas[p.id])}
              className="mt-1 rounded-full bg-primary py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Continuar
            </button>
          </>
        )}

        {etapa === "bateria" && (
          <>
            <VoltarBotao onClick={() => setEtapa("checklist")} />
            <p className="text-sm font-medium text-foreground">Como está a bateria?</p>
            <div className="flex flex-col gap-2">
              {OPCOES_BATERIA.map((op) => (
                <button
                  key={op.label}
                  onClick={() => setBateriaSaude(op.saude)}
                  className={`rounded-xl border px-3.5 py-3 text-left text-sm font-medium transition-colors ${bateriaSaude === op.saude ? "border-primary bg-primary/5 text-foreground" : "border-black/[0.08] bg-white text-foreground hover:border-primary"}`}
                >
                  {op.label}
                </button>
              ))}
            </div>
            <button
              onClick={calcular}
              disabled={carregando}
              className="mt-1 rounded-full bg-primary py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {carregando ? "Calculando..." : "Ver estimativa"}
            </button>
          </>
        )}

        {etapa === "resultado" && resultado && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            {resultado.encontrado && !resultado.bloqueado && resultado.valorEstimado != null ? (
              <>
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
                  <Check className="h-7 w-7" />
                </div>
                <p className="text-sm text-muted-foreground">Estimativa de troca</p>
                <p className="font-display text-3xl font-bold text-foreground">{formatCurrency(resultado.valorEstimado)}</p>
                <p className="text-xs text-muted-foreground">
                  Esse valor é uma estimativa baseada nas informações fornecidas. O valor definitivo depende da avaliação física do aparelho pela Neotec.
                </p>

                {formaEscolhida ? (
                  <div className="mt-3 w-full rounded-xl bg-success/10 p-3 text-xs text-success-text">
                    {CONFIRMACAO_FORMA[formaEscolhida]}
                    <Link href="/loja" className="mt-2 block font-semibold underline">Ver produtos da loja</Link>
                  </div>
                ) : (
                  <div className="mt-4 flex w-full flex-col gap-2 text-left">
                    <p className="text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">Como você quer continuar?</p>
                    {OPCOES_COMPRA_TROCA.map((op) => {
                      const Icone = ICONE_FORMA[op.id];
                      const aberta = formaAberta === op.id;
                      return (
                        <div key={op.id} className="rounded-xl border border-black/[0.08] bg-white">
                          <button
                            onClick={() => setFormaAberta(aberta ? null : op.id)}
                            className="flex w-full items-center gap-2.5 p-3.5 text-left"
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Icone className="h-4 w-4" /></div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-foreground">{op.emoji} {op.titulo}</p>
                              <p className="text-xs text-muted-foreground">{op.resumo}</p>
                            </div>
                          </button>
                          {aberta && (
                            <div className="flex flex-col gap-2 border-t border-black/[0.06] p-3.5">
                              <p className="text-xs text-muted-foreground">{op.descricao}</p>
                              <input placeholder="Seu nome" value={contatoNome} onChange={(e) => setContatoNome(e.target.value)} className="rounded-lg border border-black/[0.08] px-3 py-2 text-sm outline-none focus:border-primary" />
                              <input placeholder="WhatsApp (DDD + número)" value={contatoTelefone} onChange={(e) => setContatoTelefone(e.target.value)} className="rounded-lg border border-black/[0.08] px-3 py-2 text-sm outline-none focus:border-primary" />
                              <button
                                onClick={() => handleConfirmarForma(op.id)}
                                disabled={carregando || !contatoNome.trim() || !contatoTelefone.trim()}
                                className="rounded-full bg-primary py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                              >
                                {carregando ? "Enviando..." : "Confirmar essa opção"}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-3 flex w-full flex-col gap-2">
                  <a
                    href={`https://wa.me/5534988178338?text=${encodeURIComponent(`Oi! Fiz uma avaliação de troca do meu ${variante?.nome} no site (estimativa: ${formatCurrency(resultado.valorEstimado)}) e queria saber mais.`)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 rounded-full border border-black/[0.08] bg-white py-3 text-sm font-medium text-foreground transition-colors hover:border-primary"
                  >
                    <MessageCircle className="h-4 w-4" />Falar com a Neotec
                  </a>
                  <button onClick={refazer} className="flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground hover:text-foreground">
                    <RotateCcw className="h-3.5 w-3.5" />Refazer avaliação
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground">{resultado.mensagem ?? "Esse aparelho precisa de uma avaliação da equipe para informarmos o valor."}</p>
                <div className="mt-3 flex w-full flex-col gap-2">
                  <a
                    href="https://wa.me/5534988178338?text=Oi!%20Quero%20avaliar%20meu%20aparelho%20pra%20troca"
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 rounded-full bg-primary py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-opacity hover:opacity-90"
                  >
                    <MessageCircle className="h-4 w-4" />Falar com a Neotec
                  </a>
                  <button onClick={refazer} className="flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground hover:text-foreground">
                    <RotateCcw className="h-3.5 w-3.5" />Refazer avaliação
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function VoltarBotao({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="mb-1 flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
      <ChevronLeft className="h-3.5 w-3.5" />Voltar
    </button>
  );
}
