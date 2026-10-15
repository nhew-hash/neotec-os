"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Check, Copy, ExternalLink, Minus, Monitor, Plus, Repeat, Send, Store, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { conversaDoClienteAction, enviarPropostaWhatsappAction, registrarCompartilhamentoAction, salvarPropostaAction, simularComposicaoAction } from "@/services/central-comercial/propostas.actions";
import { listarTradeInsAprovadosClienteAction } from "@/services/vendas/pdv.actions";
import type { ResultadoComposicao } from "@/services/central-comercial/propostas.service";
import type { ClienteResultado } from "@/services/central-comercial/clientes-busca.service";
import type { ItemBusca } from "@/services/central-comercial/itens-busca";
import type { ModoAtendimento } from "@/services/central-comercial/proposta";
import { paraFormatoInternacionalBR } from "@/utils/telefone";
import { formatCurrency } from "@/utils/format";
import { ClienteBusca } from "./cliente-busca";
import { ItemBuscaCampo } from "./item-busca";
import { ApresentacaoCliente } from "./apresentacao-cliente";
import { TrocaNaProposta } from "./troca-na-proposta";
import { RoteiroFechamento } from "./roteiro-fechamento";

export interface LinhaUI { tipo: "aparelho" | "produto" | "lacrado"; id: string; rotulo: string; preco: number; quantidade: number; indisponivel?: boolean }
export interface PropostaInicial {
  orcamentoId: string | null;
  cliente: ClienteResultado | null;
  itens: LinhaUI[];
  desconto: string;
  tradeInId: string | null;
  modo: ModoAtendimento;
  conversaId: string | null;
  naoContatar: boolean;
  observacoes: string;
  aviso: string | null;
}

const chave = (l: { tipo: string; id: string }) => `${l.tipo}:${l.id}`;

export function PropostaForm({ inicial, ehGerencia, vendedorNome, abrirTroca }: { inicial: PropostaInicial; ehGerencia: boolean; vendedorNome?: string | null; abrirTroca?: boolean }) {
  const [modo, setModo] = useState<ModoAtendimento>(inicial.modo);
  const [cliente, setCliente] = useState<ClienteResultado | null>(inicial.cliente);
  const [linhas, setLinhas] = useState<LinhaUI[]>(inicial.itens);
  const [desconto, setDesconto] = useState(inicial.desconto);
  const [tradeInId, setTradeInId] = useState<string | null>(inicial.tradeInId);
  // Técnica de venda: o Pix é o 2º passo. Começa desligado e só entra na mensagem/tela do cliente quando a vendedora libera.
  const [incluirAVista, setIncluirAVista] = useState(false);
  const [tradeIns, setTradeIns] = useState<{ id: string; modeloNome: string; valor: number }[]>([]);
  const [observacoes, setObservacoes] = useState(inicial.observacoes);
  const [conversa, setConversa] = useState<{ id: string; naoContatar: boolean } | null>(inicial.conversaId ? { id: inicial.conversaId, naoContatar: inicial.naoContatar } : null);

  const [resultado, setResultado] = useState<ResultadoComposicao | null>(null);
  const [erroCalculo, setErroCalculo] = useState<string | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [texto, setTexto] = useState("");
  const [textoEditado, setTextoEditado] = useState(false);

  const [orcamentoId, setOrcamentoId] = useState<string | null>(inicial.orcamentoId);
  const [sujo, setSujo] = useState(false);
  const [aviso, setAviso] = useState<{ tom: "ok" | "atencao" | "erro"; texto: string } | null>(inicial.aviso ? { tom: "atencao", texto: inicial.aviso } : null);
  const [confirmandoEnvio, setConfirmandoEnvio] = useState(false);
  const [apresentando, setApresentando] = useState(false);
  const [aguardandoConfirmacaoManual, setAguardandoConfirmacaoManual] = useState(false);
  const [pendente, start] = useTransition();
  const sequencia = useRef(0);

  const noMarcou = useRef(false);
  const marcarSujo = useCallback(() => { if (noMarcou.current) setSujo(true); }, []);
  useEffect(() => { noMarcou.current = true; }, []);

  // ---- Troca aprovada do cliente
  useEffect(() => {
    setTradeIns([]);
    if (!cliente) { setTradeInId(null); return; }
    let ativo = true;
    listarTradeInsAprovadosClienteAction(cliente.id).then((r) => { if (ativo && r.success) setTradeIns(r.data); });
    return () => { ativo = false; };
  }, [cliente]);

  // ---- Conversa do cliente (modo WhatsApp envia na conversa CERTA, nunca numa genérica)
  useEffect(() => {
    if (!cliente) { setConversa(null); return; }
    if (conversa && inicial.cliente?.id === cliente.id) return;
    let ativo = true;
    conversaDoClienteAction(cliente.id).then((r) => { if (ativo && r.success) setConversa(r.data ? { id: r.data.conversaId, naoContatar: r.data.naoContatar } : null); });
    return () => { ativo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente?.id]);

  // ---- Cálculo no servidor (motor único), com debounce e descarte de resposta velha
  const entradaCalculo = useMemo(() => ({
    itens: linhas.filter((l) => !l.indisponivel).map((l) => ({ tipo: l.tipo, id: l.id, quantidade: l.quantidade })),
    desconto: Number(desconto.replace(",", ".")) || 0,
    tradeInId, clienteId: cliente?.id ?? null, clienteNome: cliente?.nome ?? null, modo, conversaId: conversa?.id ?? null, incluirAVista,
  }), [linhas, desconto, tradeInId, cliente, modo, conversa, incluirAVista]);

  useEffect(() => {
    if (entradaCalculo.itens.length === 0) { setResultado(null); setErroCalculo(null); return; }
    const minha = ++sequencia.current;
    setCalculando(true);
    const t = setTimeout(async () => {
      const r = await simularComposicaoAction(entradaCalculo);
      if (minha !== sequencia.current) return;
      setCalculando(false);
      if (!r.success) { setResultado(null); setErroCalculo(r.error); return; }
      setErroCalculo(null); setResultado(r.data);
    }, 400);
    return () => clearTimeout(t);
  }, [entradaCalculo]);

  useEffect(() => { if (resultado && !textoEditado) setTexto(resultado.texto); }, [resultado, textoEditado]);

  // ---- Ações sobre as linhas
  function adicionar(item: ItemBusca) {
    setLinhas((atual) => {
      const existente = atual.find((l) => chave(l) === chave(item));
      if (existente) return item.tipo === "produto" ? atual.map((l) => (chave(l) === chave(item) ? { ...l, quantidade: Math.min(l.quantidade + 1, 20) } : l)) : atual;
      return [...atual, { tipo: item.tipo, id: item.id, rotulo: item.rotulo, preco: item.preco, quantidade: 1 }];
    });
    marcarSujo();
  }
  const alterarQtd = (l: LinhaUI, delta: number) => { setLinhas((a) => a.map((x) => (chave(x) === chave(l) ? { ...x, quantidade: Math.min(Math.max(x.quantidade + delta, 1), 20) } : x))); marcarSujo(); };
  const remover = (l: LinhaUI) => { setLinhas((a) => a.filter((x) => chave(x) !== chave(l))); marcarSujo(); };

  const bloqueioAprovacao = resultado?.avaliacaoDesconto.situacao === "requer_aprovacao";
  const podeSalvar = !!cliente && !!resultado && !bloqueioAprovacao && !calculando && !pendente;

  // ---- Salvar (idempotente no servidor)
  async function garantirSalva(): Promise<string | null> {
    if (orcamentoId && !sujo) return orcamentoId;
    if (!cliente || !resultado) { setAviso({ tom: "atencao", texto: "Escolha o cliente e os itens para salvar a proposta." }); return null; }
    const r = await salvarPropostaAction({ ...entradaCalculo, clienteId: cliente.id, observacoes, retomarId: orcamentoId });
    if (!r.success) { setAviso({ tom: "erro", texto: r.error }); return null; }
    setOrcamentoId(r.data.orcamentoId); setSujo(false);
    // Lacrado de encomenda virou aparelho ao salvar: troca a linha para não cadastrar outra unidade.
    if (r.data.substituicoes?.length) {
      const mapa = new Map(r.data.substituicoes.map((x) => [x.de, x.para]));
      setLinhas((atual) => atual.map((l) => { const para = mapa.get(chave(l)); return para ? { ...l, tipo: para.tipo, id: para.id } : l; }));
    }
    setAviso({
      tom: r.data.historicoDisponivel ? "ok" : "atencao",
      texto: r.data.reaproveitada ? "Esta proposta já estava salva (não duplicamos)." : r.data.atualizada ? "Proposta atualizada." : "Proposta salva.",
    });
    if (!r.data.historicoDisponivel) setAviso({ tom: "atencao", texto: "Proposta salva, mas o histórico detalhado ainda não está ativo (migration fase268 pendente)." });
    return r.data.orcamentoId;
  }
  const salvar = () => start(async () => { await garantirSalva(); });

  // ---- Compartilhar
  async function copiar() {
    try { await navigator.clipboard.writeText(texto); } catch { setAviso({ tom: "erro", texto: "Não foi possível copiar. Selecione o texto e copie." }); return; }
    let registrado = false;
    if (cliente && resultado) {
      const id = await garantirSalva();
      if (id) { const r = await registrarCompartilhamentoAction({ orcamentoId: id, tipo: "copiada", modo }); registrado = r.success; }
    }
    setAviso({ tom: "ok", texto: registrado ? "Mensagem copiada e registrada no histórico." : "Mensagem copiada." });
  }
  function abrirWhatsapp() {
    if (!cliente) return setAviso({ tom: "atencao", texto: "Escolha o cliente primeiro." });
    start(async () => {
      const id = await garantirSalva();
      if (!id) return;
      window.open(`https://wa.me/${paraFormatoInternacionalBR(cliente.whatsapp)}?text=${encodeURIComponent(texto)}`, "_blank", "noopener,noreferrer");
      await registrarCompartilhamentoAction({ orcamentoId: id, tipo: "whatsapp_aberto", modo: "whatsapp" });
      setAguardandoConfirmacaoManual(true);
      setAviso({ tom: "atencao", texto: "Abrimos o WhatsApp com a mensagem. Ela ainda NÃO consta como enviada: depois de mandar, confirme abaixo." });
    });
  }
  function enviarPeloSistema() {
    if (!conversa) return;
    start(async () => {
      const id = await garantirSalva();
      if (!id) return;
      const r = await enviarPropostaWhatsappAction({ orcamentoId: id, conversaId: conversa.id, texto });
      setConfirmandoEnvio(false);
      setAviso(r.success ? { tom: "ok", texto: "Mensagem enviada pelo WhatsApp e registrada. A proposta ficou aguardando resposta." } : { tom: "erro", texto: r.error });
    });
  }
  function confirmarEnvioManual() {
    if (!orcamentoId) return;
    start(async () => {
      const r = await registrarCompartilhamentoAction({ orcamentoId, tipo: "enviada_manual", modo: "whatsapp" });
      setAguardandoConfirmacaoManual(false);
      setAviso(r.success ? { tom: "ok", texto: "Registrado: mensagem enviada. A proposta ficou aguardando resposta." } : { tom: "erro", texto: r.error });
    });
  }

  const dadosApresentacao = resultado ? { linhas: resultado.linhas, proposta: resultado.proposta, nomeCliente: cliente?.nome ?? null, mostrarAVista: incluirAVista } : null;
  const total = resultado?.proposta.aVista;

  return (
    <div className="grid grid-cols-1 gap-8 pb-28 lg:grid-cols-[minmax(0,1fr)_420px] lg:pb-0">
      <div className="space-y-8">
        {/* Modo de atendimento */}
        <div role="radiogroup" aria-label="Como você está atendendo" className="grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1">
          {([["presencial", "Na loja", Store], ["whatsapp", "WhatsApp", Send]] as const).map(([valor, rotulo, Icone]) => (
            <button key={valor} type="button" role="radio" aria-checked={modo === valor} onClick={() => { setModo(valor); marcarSujo(); setConfirmandoEnvio(false); }}
              className={cn("flex min-h-11 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors", modo === valor ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              <Icone className="h-4 w-4" aria-hidden />{rotulo}
            </button>
          ))}
        </div>

        {aviso && (
          <p role={aviso.tom === "erro" ? "alert" : "status"} className={cn("rounded-lg px-3 py-2 text-sm", aviso.tom === "ok" && "bg-success-soft text-success-text", aviso.tom === "atencao" && "bg-warning-soft text-warning-text", aviso.tom === "erro" && "bg-danger-soft text-danger")}>{aviso.texto}</p>
        )}

        <section aria-labelledby="sec-cliente" className="space-y-3">
          <h2 id="sec-cliente" className="font-display text-base font-semibold">Cliente</h2>
          <ClienteBusca cliente={cliente} onSelecionar={(c) => { setCliente(c); marcarSujo(); if (!c) setConversa(null); }} desabilitado={!!orcamentoId} />
          {modo === "whatsapp" && cliente && (
            conversa ? (conversa.naoContatar
              ? <p className="text-sm text-danger">Este cliente pediu para não ser contatado. Não envie a proposta por WhatsApp.</p>
              : <p className="text-sm text-muted-foreground">Conversa encontrada: o envio vai para ela.</p>)
            : <p className="text-sm text-muted-foreground">Este cliente ainda não tem conversa no sistema. Você pode abrir o WhatsApp com o texto pronto.</p>
          )}
        </section>

        <section aria-labelledby="sec-itens" className="space-y-3">
          <h2 id="sec-itens" className="font-display text-base font-semibold">Itens</h2>
          <ItemBuscaCampo onAdicionar={adicionar} jaNaProposta={new Set(linhas.map(chave))} />
          {linhas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Busque o aparelho ou o acessório e toque para adicionar, ou{" "}
              <Link href={`/central-comercial/catalogo${cliente ? `?cliente=${cliente.id}` : ""}`} className="font-medium text-primary hover:underline">escolha no catálogo com fotos</Link>.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border bg-card">
              {linhas.map((l) => (
                <li key={chave(l)} className="flex items-center gap-3 px-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm font-medium", l.indisponivel && "text-danger line-through")}>{l.rotulo}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">{l.indisponivel ? "Não está mais disponível. Remova da proposta." : formatCurrency(l.preco)}</p>
                  </div>
                  {l.tipo === "produto" && !l.indisponivel && (
                    <div className="flex items-center gap-1" role="group" aria-label={`Quantidade de ${l.rotulo}`}>
                      <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => alterarQtd(l, -1)} disabled={l.quantidade <= 1} aria-label="Diminuir"><Minus className="h-4 w-4" /></Button>
                      <span className="w-6 text-center text-sm tabular-nums" aria-live="polite">{l.quantidade}</span>
                      <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => alterarQtd(l, 1)} disabled={l.quantidade >= 20} aria-label="Aumentar"><Plus className="h-4 w-4" /></Button>
                    </div>
                  )}
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground" onClick={() => remover(l)} aria-label={`Remover ${l.rotulo}`}><Trash2 className="h-4 w-4" /></Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="sec-cond" className="space-y-3">
          <h2 id="sec-cond" className="font-display text-base font-semibold">Condições</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Desconto (R$)</span>
              <Input inputMode="decimal" placeholder="0,00" value={desconto} onChange={(e) => { setDesconto(e.target.value); marcarSujo(); }} className="h-11" /></label>
            {tradeIns.length > 0 && (
              <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Aparelho na troca (aprovado)</span>
                <select className="h-11 rounded-md border border-input bg-background px-2 text-sm" value={tradeInId ?? ""} onChange={(e) => { setTradeInId(e.target.value || null); marcarSujo(); }}>
                  <option value="">Sem troca</option>
                  {tradeIns.map((t) => <option key={t.id} value={t.id}>{`${t.modeloNome} — ${formatCurrency(t.valor)}`}</option>)}
                </select></label>
            )}
          </div>
          {cliente && (
            <div className="flex flex-col gap-1.5">
              <TrocaNaProposta
                abrirAoMontar={!!abrirTroca}
                cliente={{ id: cliente.id, nome: cliente.nome, telefone: cliente.whatsapp || null }}
                onAprovada={(t) => { setTradeIns((atual) => [t, ...atual.filter((x) => x.id !== t.id)]); setTradeInId(t.id); marcarSujo(); }}
              />
              {tradeIns.length === 0 && <p className="text-xs text-muted-foreground">Sem troca aprovada para este cliente ainda.</p>}
            </div>
          )}
          {!cliente && (
            <div className="flex flex-col gap-1.5">
              <Button type="button" variant="outline" disabled className="h-11 justify-start gap-2"><Repeat className="h-4 w-4" aria-hidden /> Avaliar aparelho do cliente na troca</Button>
              <p className="text-xs text-muted-foreground">Escolha o cliente acima para avaliar o aparelho dele na troca.</p>
            </div>
          )}
          <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Observação interna <span className="font-normal text-muted-foreground">(não aparece para o cliente)</span></span>
            <Textarea value={observacoes} onChange={(e) => { setObservacoes(e.target.value); marcarSujo(); }} maxLength={500} rows={2} /></label>
        </section>
      </div>

      {/* Resumo */}
      <aside className="space-y-4 lg:sticky lg:top-16 lg:self-start" aria-label="Resumo da proposta">
        <Card className="space-y-4 p-5">
          {!resultado ? (
            <div className="space-y-2">
              <p className="font-display text-base font-semibold">Resumo</p>
              {calculando ? <p className="text-sm text-muted-foreground" role="status">Calculando…</p>
                : erroCalculo ? <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{erroCalculo}</p>
                : <p className="text-sm text-muted-foreground">Adicione um item para ver o valor à vista e as parcelas.</p>}
            </div>
          ) : (
            <>
              <div className={cn("transition-opacity", calculando && "opacity-60")}>
                <p className="text-sm text-muted-foreground">{resultado.proposta.tradeInValor > 0 ? "A volta, com a troca (1º valor a falar)" : "Valor (1º valor a falar)"}</p>
                <p className="font-display text-4xl font-semibold tabular-nums tracking-tight" aria-live="polite">{resultado.proposta.valorCheio > 0 ? formatCurrency(resultado.proposta.valorCheio) : "Sem volta a pagar"}</p>
                <p className="mt-1 text-sm text-muted-foreground">À vista no Pix (2º passo, se o cliente pedir): <span className="font-medium tabular-nums text-foreground">{formatCurrency(resultado.proposta.aVista)}</span></p>
                {(resultado.proposta.desconto > 0 || resultado.proposta.tradeInValor > 0) && (
                  <dl className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                    <div className="flex justify-between"><dt>Valor dos itens</dt><dd className="tabular-nums">{formatCurrency(resultado.proposta.precoTabela)}</dd></div>
                    {resultado.proposta.desconto > 0 && <div className="flex justify-between"><dt>Desconto</dt><dd className="tabular-nums">- {formatCurrency(resultado.proposta.desconto)}</dd></div>}
                    {resultado.proposta.tradeInValor > 0 && <div className="flex justify-between"><dt>{resultado.tradeIn?.modeloNome ?? "Troca"}</dt><dd className="tabular-nums">- {formatCurrency(resultado.proposta.tradeInValor)}</dd></div>}
                  </dl>
                )}
                <label className="mt-3 flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 h-4 w-4" checked={incluirAVista} onChange={(e) => { setIncluirAVista(e.target.checked); setTextoEditado(false); }} /><span>Liberar o valor à vista (Pix) na mensagem e na tela do cliente</span></label>
              </div>

              {bloqueioAprovacao && resultado.avaliacaoDesconto.situacao === "requer_aprovacao" && (
                <p role="alert" className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning-text">
                  Este desconto ({resultado.avaliacaoDesconto.percentual}%) passa do seu limite de {resultado.avaliacaoDesconto.limite}%. Reduza o desconto ou peça a aprovação do gerente no PDV.
                </p>
              )}

              {resultado.parcelamentoConfigurado ? (
                <table className="w-full text-sm">
                  <caption className="sr-only">Parcelamento no cartão</caption>
                  <thead><tr className="text-left text-xs text-muted-foreground"><th className="pb-1 font-medium">Parcelas</th><th className="pb-1 font-medium">Parcela</th><th className="pb-1 text-right font-medium">Total</th></tr></thead>
                  <tbody>
                    {resultado.proposta.opcoes.filter((o) => o.parcelas > 1).map((o) => (
                      <tr key={o.parcelas} className="border-t border-border tabular-nums">
                        <td className="py-1.5">{o.parcelas}x {!o.comJuros && <span className="text-xs text-success-text">sem juros</span>}</td>
                        <td className="py-1.5">{formatCurrency(o.valorParcela)}</td>
                        <td className="py-1.5 text-right text-muted-foreground">{formatCurrency(o.valorTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p role="status" className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning-text">O parcelamento no cartão ainda não está configurado. O valor à vista está correto; avise a Gerência para cadastrar a tabela de taxas.</p>
              )}

              {ehGerencia && resultado.resultadoEstimado && (
                <p className="rounded-md bg-secondary px-3 py-2 text-xs text-muted-foreground">Só gerência: custo {formatCurrency(resultado.resultadoEstimado.custo)} · resultado estimado {formatCurrency(resultado.resultadoEstimado.resultado)} (sem a revenda do aparelho da troca).</p>
              )}
            </>
          )}
        </Card>

        {resultado && (
          <Card className="space-y-3 p-5">
            <div className="flex items-center justify-between">
              <label htmlFor="msg" className="font-display text-base font-semibold">Mensagem</label>
              {textoEditado && <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => { setTextoEditado(false); setTexto(resultado.texto); }}>Restaurar texto automático</button>}
            </div>
            <Textarea id="msg" value={texto} onChange={(e) => { setTexto(e.target.value); setTextoEditado(true); }} rows={11} className="text-sm leading-relaxed" />
            <p className="text-xs text-muted-foreground">Revise e edite antes de enviar. Só usa valores calculados acima.</p>
          </Card>
        )}

        <div className="hidden space-y-2 lg:block">
          {Acoes()}
        </div>

        <RoteiroFechamento cliente={cliente ? { id: cliente.id, nome: cliente.nome } : null} vendedora={vendedorNome ?? null} naoContatar={!!conversa?.naoContatar} />
      </aside>

      {/* Barra fixa no celular: total e ações principais ao alcance do polegar */}
      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-card/95 p-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="min-w-0 flex-1"><p className="text-xs text-muted-foreground">À vista</p><p className="truncate font-display text-lg font-semibold tabular-nums">{total !== undefined ? formatCurrency(total) : "—"}</p></div>
          {MobileAcoes()}
        </div>
      </div>

      {apresentando && dadosApresentacao && <ApresentacaoCliente dados={dadosApresentacao} onFechar={() => setApresentando(false)} />}
    </div>
  );

  // ---- Blocos de ação (declarados como funções internas para compartilhar estado entre desktop e mobile)
  function Acoes() {
    return (
      <>
        <Button type="button" className="w-full" size="lg" onClick={salvar} disabled={!podeSalvar}>
          {pendente ? "Salvando…" : orcamentoId ? (sujo ? "Atualizar proposta" : "Proposta salva") : "Salvar proposta"}
          {orcamentoId && !sujo && <Check className="ml-2 h-4 w-4" aria-hidden />}
        </Button>
        {!cliente && resultado && <p className="text-center text-xs text-muted-foreground">Escolha o cliente para salvar.</p>}
        {modo === "presencial" ? (
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" onClick={() => setApresentando(true)} disabled={!resultado}><Monitor className="mr-2 h-4 w-4" aria-hidden />Apresentar</Button>
            <Button type="button" variant="outline" onClick={copiar} disabled={!resultado}><Copy className="mr-2 h-4 w-4" aria-hidden />Copiar</Button>
          </div>
        ) : (
          <div className="space-y-2">
            {conversa && !conversa.naoContatar && (
              confirmandoEnvio ? (
                <div className="flex gap-2">
                  <Button type="button" className="flex-1" onClick={enviarPeloSistema} disabled={pendente || !resultado}>Confirmar envio</Button>
                  <Button type="button" variant="ghost" onClick={() => setConfirmandoEnvio(false)}>Cancelar</Button>
                </div>
              ) : <Button type="button" className="w-full" onClick={() => setConfirmandoEnvio(true)} disabled={!resultado || !cliente || bloqueioAprovacao}><Send className="mr-2 h-4 w-4" aria-hidden />Enviar na conversa</Button>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" onClick={abrirWhatsapp} disabled={!resultado || !cliente || bloqueioAprovacao || pendente}><ExternalLink className="mr-2 h-4 w-4" aria-hidden />Abrir WhatsApp</Button>
              <Button type="button" variant="outline" onClick={copiar} disabled={!resultado}><Copy className="mr-2 h-4 w-4" aria-hidden />Copiar</Button>
            </div>
            {aguardandoConfirmacaoManual && (
              <Button type="button" variant="secondary" className="w-full" onClick={confirmarEnvioManual} disabled={pendente}>Já enviei a mensagem</Button>
            )}
          </div>
        )}
        {modo === "whatsapp" && <Button type="button" variant="ghost" className="w-full" onClick={() => setApresentando(true)} disabled={!resultado}>Mostrar na tela ao cliente</Button>}
        {orcamentoId && <Link href="/central-comercial/propostas" className={cn(buttonVariants({ variant: "link" }), "w-full")}>Ver minhas propostas</Link>}
        {orcamentoId && <p className="text-center text-xs text-muted-foreground">Quando o cliente fechar, aprove a proposta em Vendas para virar venda.</p>}
      </>
    );
  }
  function MobileAcoes() {
    return (
      <div className="flex gap-2">
        {modo === "presencial" && <Button type="button" variant="outline" onClick={() => setApresentando(true)} disabled={!resultado}>Apresentar</Button>}
        {modo === "whatsapp" && <Button type="button" variant="outline" onClick={abrirWhatsapp} disabled={!resultado || !cliente || bloqueioAprovacao || pendente}>WhatsApp</Button>}
        <Button type="button" onClick={salvar} disabled={!podeSalvar}>{orcamentoId && !sujo ? "Salva" : "Salvar"}</Button>
      </div>
    );
  }
}
