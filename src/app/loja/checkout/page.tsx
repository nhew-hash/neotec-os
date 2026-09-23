"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, CreditCard, QrCode, Package, ShieldCheck, MessageCircle } from "lucide-react";
import { useCarrinho } from "@/components/loja/carrinho-context";
import { iniciarCheckoutPixAction, pagarComCartaoAction, buscarPublicKeyMercadoPagoAction, calcularTotalCartaoAction, consultarSaldoCashbackPorTelefoneAction } from "@/services/pagamentos/payment.controller";
import { validarCupomAction } from "@/services/loja/cupom.actions";
import { calcularDescontoCupom } from "@/services/loja/cupom.utils";
import { CardPaymentBrick } from "@/components/loja/card-payment-brick";
import { PixPagamento } from "@/components/loja/pix-pagamento";
import { SeletorEntrega, type SelecaoEntrega } from "@/components/loja/seletor-entrega";
import { listarRegrasFretePublicoAction } from "@/services/loja-admin/central-loja.actions";
import { lerTradeInPendente, limparTradeInPendente, type TradeInPendente } from "@/services/loja/trade-in-pendente";
import { confirmarPagamentoAntecipadoTrocaAction } from "@/services/loja/trade-in-wizard.actions";
import { formatCurrency } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import type { RegraFrete } from "@/types";

import { CriarContaPosCompra } from "@/components/loja/criar-conta-pos-compra";

type MetodoPagamento = "pix" | "cartao";
type EtapaCheckout = "dados" | "pagamento" | "trocaEstorno" | "aprovado" | "recusado";

export default function CheckoutPage() {
  const { itens, total, limpar } = useCarrinho();
  const [etapa, setEtapa] = useState<EtapaCheckout>("dados");
  const [metodo, setMetodo] = useState<MetodoPagamento>("pix");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [camposInvalidos, setCamposInvalidos] = useState<{ nome?: boolean; telefone?: boolean; cpf?: boolean }>({});

  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [gatewayAtivo, setGatewayAtivo] = useState(true);
  const [totalCartao, setTotalCartao] = useState<number | null>(null);
  // Base (valor em Pix) sobre a qual o totalCartao acima foi
  // calculado — se o totalComDesconto mudar (cupom, cashback, frete)
  // depois do cálculo, totalCartao fica desatualizado até recalcular
  // de novo; comparar as duas evita usar/mostrar um valor de cartão
  // que não é mais o certo pro pedido atual.
  const [totalCartaoBase, setTotalCartaoBase] = useState<number | null>(null);
  const [regrasFrete, setRegrasFrete] = useState<Pick<RegraFrete, "id" | "regiao" | "valor" | "prazo_dias_uteis" | "nacional">[]>([]);
  const [entregaSelecionada, setEntregaSelecionada] = useState<SelecaoEntrega>({ tipo: "retirada" });

  const [dadosPix, setDadosPix] = useState<{ pagamentoId: string; qrCodeBase64: string | null; copiaCola: string | null; expiraEm: string | null } | null>(null);
  const [cupomInput, setCupomInput] = useState("");
  const [cupomAplicado, setCupomAplicado] = useState<{ codigo: string; desconto: number } | null>(null);
  const [validandoCupom, setValidandoCupom] = useState(false);
  const [erroCupom, setErroCupom] = useState<string | null>(null);
  const [saldoCashback, setSaldoCashback] = useState(0);
  const [usarCashback, setUsarCashback] = useState(false);

  // Trade-in "pagamento antecipado" (Fase 238) — se o cliente veio do
  // wizard de trade-in escolhendo essa forma, a estimativa fica
  // guardada no navegador até aqui. O valor entra como desconto no 1º
  // pagamento; o 2º pagamento (o valor do aparelho, a estornar depois
  // da avaliação física) acontece logo em seguida, na etapa "trocaEstorno".
  const [tradeInPendente, setTradeInPendente] = useState<TradeInPendente | null>(null);
  const [usarTradeIn, setUsarTradeIn] = useState(true);
  const [pedidoIdProduto, setPedidoIdProduto] = useState<string | null>(null);
  const [processandoTroca, setProcessandoTroca] = useState(false);
  const [erroTroca, setErroTroca] = useState<string | null>(null);
  const [dadosPixTroca, setDadosPixTroca] = useState<{ pagamentoId: string; qrCodeBase64: string | null; copiaCola: string | null; expiraEm: string | null } | null>(null);
  const [pedidoIdTroca, setPedidoIdTroca] = useState<string | null>(null);
  // O Brick de cartão do Mercado Pago só aceita 1 submit por instância
  // — depois de uma recusa, precisa remontar do zero pra tentar de
  // novo (mesmo motivo pelo qual o fluxo principal manda pra uma tela
  // "recusado" separada em vez de reusar o mesmo componente).
  const [tentativaCartaoTroca, setTentativaCartaoTroca] = useState(0);

  useEffect(() => {
    setTradeInPendente(lerTradeInPendente());
  }, []);

  const totalAposCupom = Math.max(0, total - (cupomAplicado?.desconto ?? 0));
  const cashbackAplicavel = usarCashback ? Math.min(saldoCashback, totalAposCupom) : 0;
  const tradeInAplicado = tradeInPendente && usarTradeIn ? Math.min(tradeInPendente.valorEstimado, Math.max(0, totalAposCupom - cashbackAplicavel)) : 0;
  const regraSelecionada = entregaSelecionada.tipo === "entrega" ? regrasFrete.find((r) => r.id === entregaSelecionada.regiaoId) : null;
  const valorFreteSelecionado = regraSelecionada?.valor ?? 0;
  const totalComDesconto = Math.max(0, totalAposCupom - cashbackAplicavel - tradeInAplicado) + valorFreteSelecionado;
  // totalCartao só é confiável se foi calculado em cima do
  // totalComDesconto ATUAL — se cupom/cashback/frete mudarem depois
  // do cálculo, essa comparação invalida o valor até recalcular de
  // novo (ver efeito abaixo).
  const totalCartaoValido = totalCartao != null && totalCartaoBase === totalComDesconto;
  // No cartão, o valor cobrado usa o motor de precificação (mesma
  // taxa configurada em Financeiro → Parcelamento que já aparece na
  // ficha do produto) — nunca o valor do Pix direto. O Pix nunca é
  // afetado por isso.
  const totalFinal = metodo === "cartao" && totalCartaoValido ? (totalCartao as number) : totalComDesconto;

  useEffect(() => {
    const digitos = telefone.replace(/\D/g, "");
    if (digitos.length < 10) return setSaldoCashback(0);
    const timer = setTimeout(() => {
      consultarSaldoCashbackPorTelefoneAction(digitos).then((result) => {
        if (result.success) setSaldoCashback(result.data.saldo);
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [telefone]);

  useEffect(() => {
    buscarPublicKeyMercadoPagoAction().then((result) => {
      if (result.success) {
        setPublicKey(result.data.publicKey);
        setGatewayAtivo(result.data.ativo);
      }
    });
    listarRegrasFretePublicoAction().then((result) => {
      if (result.success) setRegrasFrete(result.data);
    });
  }, []);

  // Recalcula o valor do cartão (motor de precificação) sempre que o
  // total em Pix muda — cupom, cashback e frete já entram aqui porque
  // fazem parte do `totalComDesconto`.
  useEffect(() => {
    if (metodo !== "cartao" || totalComDesconto <= 0) return;
    let cancelado = false;
    calcularTotalCartaoAction(totalComDesconto).then((result) => {
      if (cancelado || !result.success) return;
      setTotalCartao(result.data.valorCartao);
      setTotalCartaoBase(totalComDesconto);
    });
    return () => { cancelado = true; };
  }, [metodo, totalComDesconto]);

  useEffect(() => {
    if (itens.length === 0) return;
    void import("@/components/loja/loja-tracking-provider").then(({ rastrearEventoCheckout }) => rastrearEventoCheckout("checkout_view"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function validarDados(): boolean {
    const cpfDigitos = cpf.replace(/\D/g, "");
    if (!nome.trim() || !telefone.trim() || cpfDigitos.length !== 11) {
      setErro(!nome.trim() || !telefone.trim() ? "Informe nome e telefone" : "CPF inválido — precisa ter 11 dígitos");
      setCamposInvalidos({ nome: !nome.trim(), telefone: !telefone.trim(), cpf: cpfDigitos.length !== 11 });
      return false;
    }
    if (entregaSelecionada.tipo === "entrega") {
      const { cep, rua, numero, bairro, cidade, estado } = entregaSelecionada.endereco;
      if (cep.length !== 8 || !rua.trim() || !numero.trim() || !bairro.trim() || !cidade.trim() || !estado.trim()) {
        setErro("Preenche o endereço completo (CEP, rua, número e bairro) pra continuar com entrega");
        return false;
      }
    }
    setCamposInvalidos({});
    return true;
  }

  async function handleIrParaPagamento() {
    setErro(null);
    if (!validarDados()) return;
    void import("@/components/loja/loja-tracking-provider").then(({ rastrearEventoCheckout }) => rastrearEventoCheckout("checkout_started"));
    setEtapa("pagamento");
  }

  async function handleAplicarCupom() {
    setErroCupom(null);
    if (!cupomInput.trim()) return;

    setValidandoCupom(true);
    const result = await validarCupomAction(cupomInput.trim(), total);
    setValidandoCupom(false);

    if (!result.success) return setErroCupom(result.error);
    if (!result.data.valido || !result.data.tipoDesconto || result.data.valor == null) {
      return setErroCupom(result.data.motivo ?? "Cupom inválido");
    }

    const desconto = calcularDescontoCupom(total, result.data.tipoDesconto, result.data.valor);
    setCupomAplicado({ codigo: cupomInput.trim().toUpperCase(), desconto });
  }

  function handleRemoverCupom() {
    setCupomAplicado(null);
    setCupomInput("");
    setErroCupom(null);
  }

  async function handlePagarPix() {
    setErro(null);
    setProcessando(true);
    const result = await iniciarCheckoutPixAction({
      nomeContato: nome, telefoneContato: telefone, itens, cpf: cpf.trim() || undefined, cupomCodigo: cupomAplicado?.codigo, usarCashback: cashbackAplicavel,
      tipoEntrega: entregaSelecionada.tipo, regiaoEntrega: regraSelecionada?.regiao,
      endereco: entregaSelecionada.tipo === "entrega" ? entregaSelecionada.endereco : undefined,
    });
    setProcessando(false);

    if (!result.success) {
      void import("@/components/loja/loja-tracking-provider").then(({ rastrearEventoCheckout }) => rastrearEventoCheckout("payment_failed"));
      return setErro(result.error);
    }
    setPedidoIdProduto(result.data.pedidoId);
    setDadosPix({ pagamentoId: result.data.pagamentoId, qrCodeBase64: result.data.qrCodeBase64, copiaCola: result.data.copiaCola, expiraEm: result.data.expiraEm });
  }

  async function handlePagarCartao(dados: { token: string; installments: number; paymentMethodId: string }) {
    setErro(null);
    setProcessando(true);
    const result = await pagarComCartaoAction({
      nomeContato: nome, telefoneContato: telefone, itens,
      token: dados.token, parcelas: dados.installments, metodoPagamentoId: dados.paymentMethodId, cpf: cpf.trim() || undefined, cupomCodigo: cupomAplicado?.codigo, usarCashback: cashbackAplicavel,
      tipoEntrega: entregaSelecionada.tipo, regiaoEntrega: regraSelecionada?.regiao,
      endereco: entregaSelecionada.tipo === "entrega" ? entregaSelecionada.endereco : undefined,
    });
    setProcessando(false);

    if (!result.success) return setErro(result.error);
    if (result.data.status === "aprovado") {
      setPedidoIdProduto(result.data.pedidoId);
      void import("@/components/loja/loja-tracking-provider").then(({ rastrearEventoCheckout }) => rastrearEventoCheckout("payment_success"));
      if (tradeInAplicado > 0 && tradeInPendente) {
        setEtapa("trocaEstorno");
      } else {
        limpar();
        setEtapa("aprovado");
      }
    } else if (result.data.status === "recusado") {
      setEtapa("recusado");
      void import("@/components/loja/loja-tracking-provider").then(({ rastrearEventoCheckout }) => rastrearEventoCheckout("payment_failed"));
    } else {
      setErro("Pagamento em análise — você recebe a confirmação assim que o Mercado Pago processar.");
    }
  }

  function handlePixAprovado() {
    void import("@/components/loja/loja-tracking-provider").then(({ rastrearEventoCheckout }) => rastrearEventoCheckout("payment_success"));
    if (tradeInAplicado > 0 && tradeInPendente) {
      setEtapa("trocaEstorno");
    } else {
      limpar();
      setEtapa("aprovado");
    }
  }

  // --- 2º pagamento do trade-in "pagamento antecipado" (Fase 238) ----------
  // Mesmo valor mostrado no wizard — nunca recalculado a partir de nada
  // que o cliente possa alterar aqui, e cobrado do MESMO jeito (Pix ou
  // cartão) que o 1º pagamento, só que como um item virtual "trade_in"
  // (sem produto/aparelho real por trás, ver `loja-pedido.actions.ts`).
  function itemTradeInParaCobranca(): { tipo: "trade_in"; id: string; nome: string; quantidade: number; valor: number }[] {
    if (!tradeInPendente) return [];
    return [{ tipo: "trade_in", id: tradeInPendente.avaliacaoId, nome: `Trade-in — ${tradeInPendente.modeloNome} (a estornar após avaliação)`, quantidade: 1, valor: tradeInPendente.valorEstimado }];
  }

  async function handleGerarPixTroca() {
    if (!tradeInPendente) return;
    setErroTroca(null);
    setProcessandoTroca(true);
    const result = await iniciarCheckoutPixAction({
      nomeContato: nome, telefoneContato: telefone, itens: itemTradeInParaCobranca(), cpf: cpf.trim() || undefined,
    });
    setProcessandoTroca(false);
    if (!result.success) return setErroTroca(result.error);
    setPedidoIdTroca(result.data.pedidoId);
    setDadosPixTroca({ pagamentoId: result.data.pagamentoId, qrCodeBase64: result.data.qrCodeBase64, copiaCola: result.data.copiaCola, expiraEm: result.data.expiraEm });
  }

  async function finalizarPagamentoAntecipado(pedidoEstornoId: string) {
    if (!tradeInPendente) return;
    const result = await confirmarPagamentoAntecipadoTrocaAction({
      avaliacaoId: tradeInPendente.avaliacaoId,
      pedidoProdutoId: pedidoIdProduto ?? "",
      pedidoEstornoId,
    });
    if (!result.success) {
      // Os dois pagamentos já caíram — não trava a confirmação de
      // compra por causa disso, só avisa pra garantir manualmente.
      console.error("Falha ao vincular pagamento antecipado do trade-in:", result.error);
    }
    limparTradeInPendente();
    limpar();
    setEtapa("aprovado");
  }

  function handlePixTrocaAprovado() {
    if (dadosPixTroca) finalizarPagamentoAntecipado(pedidoIdTroca ?? "");
  }

  async function handlePagarCartaoTroca(dados: { token: string; installments: number; paymentMethodId: string }) {
    if (!tradeInPendente) return;
    setErroTroca(null);
    setProcessandoTroca(true);
    const result = await pagarComCartaoAction({
      nomeContato: nome, telefoneContato: telefone, itens: itemTradeInParaCobranca(),
      token: dados.token, parcelas: dados.installments, metodoPagamentoId: dados.paymentMethodId, cpf: cpf.trim() || undefined,
    });
    setProcessandoTroca(false);
    if (!result.success) return setErroTroca(result.error);
    if (result.data.status === "aprovado") {
      await finalizarPagamentoAntecipado(result.data.pedidoId);
    } else if (result.data.status === "recusado") {
      setErroTroca("O 2º pagamento (valor do seu aparelho) não foi aprovado. Seu iPhone já está pago — tenta o 2º pagamento de novo ou fala com a gente no WhatsApp pra resolver.");
      setTentativaCartaoTroca((n) => n + 1);
    } else {
      setErroTroca("2º pagamento em análise — te avisamos assim que o Mercado Pago confirmar.");
    }
  }

  if (itens.length === 0 && etapa === "dados") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
        <p className="text-sm text-foreground">Seu carrinho está vazio.</p>
        <Button asChild size="lg" pill className="mt-4 hover:bg-primary">
          <Link href="/loja">Ver produtos</Link>
        </Button>
      </div>
    );
  }

  if (etapa === "aprovado") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h1 className="font-display text-xl font-semibold text-foreground">Pagamento aprovado!</h1>
        <p className="mt-2 text-sm text-muted-foreground">Já recebemos seu pedido e vamos preparar tudo. Você recebe a confirmação pelo WhatsApp.</p>
        <CriarContaPosCompra nome={nome} whatsapp={telefone} cpf={cpf} />
        <Button asChild size="lg" pill className="mt-6 hover:bg-primary">
          <Link href="/loja">Voltar pra loja</Link>
        </Button>
      </div>
    );
  }

  if (etapa === "trocaEstorno") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h1 className="font-display text-xl font-semibold text-foreground">1º pagamento aprovado!</h1>
        <p className="text-sm text-muted-foreground">
          Falta só o 2º pagamento — o valor estimado do seu {tradeInPendente?.modeloNome} ({formatCurrency(tradeInPendente?.valorEstimado ?? 0)}).
          Esse valor é <strong>estornado</strong> assim que avaliarmos seu aparelho fisicamente.
        </p>

        <Card radius="loose" className="w-full p-5 text-left">
          <div className="mb-3 flex gap-2">
            <Button type="button" variant="outline" onClick={() => setMetodo("pix")} className={`flex-1 gap-1.5 py-3 font-medium ${metodo === "pix" ? "border-primary bg-primary/5 text-foreground" : "text-muted-foreground"}`}>
              <QrCode className="h-4 w-4" />Pix
            </Button>
            <Button type="button" variant="outline" onClick={() => setMetodo("cartao")} className={`flex-1 gap-1.5 py-3 font-medium ${metodo === "cartao" ? "border-primary bg-primary/5 text-foreground" : "text-muted-foreground"}`}>
              <CreditCard className="h-4 w-4" />Cartão
            </Button>
          </div>

          {erroTroca && <p className="mb-3 text-xs text-danger">{erroTroca}</p>}

          {metodo === "pix" && !dadosPixTroca && (
            <Button type="button" size="xl" pill onClick={handleGerarPixTroca} loading={processandoTroca} loadingText="Gerando Pix..." className="w-full">
              Gerar Pix — {formatCurrency(tradeInPendente?.valorEstimado ?? 0)}
            </Button>
          )}
          {metodo === "pix" && dadosPixTroca && (
            <PixPagamento pagamentoId={dadosPixTroca.pagamentoId} qrCodeBase64={dadosPixTroca.qrCodeBase64} copiaCola={dadosPixTroca.copiaCola} expiraEm={dadosPixTroca.expiraEm} onAprovado={handlePixTrocaAprovado} />
          )}

          {metodo === "cartao" && publicKey && (
            <>
              <p className="mb-2 rounded-lg bg-secondary/60 p-2.5 text-[11px] text-muted-foreground">No cartão, esse valor pode ter o mesmo acréscimo das demais compras — o estorno do Mercado Pago devolve exatamente o que foi cobrado.</p>
              <CardPaymentBrick key={tentativaCartaoTroca} publicKey={publicKey} valor={tradeInPendente?.valorEstimado ?? 0} onSubmit={handlePagarCartaoTroca} onErro={setErroTroca} />
            </>
          )}
          {metodo === "cartao" && !publicKey && <p className="text-sm text-muted-foreground">Carregando...</p>}
        </Card>

        <a
          href="https://wa.me/5534988178338?text=Oi!%20Fiz%20o%201%C2%BA%20pagamento%20do%20trade-in%20no%20site%20e%20preciso%20de%20ajuda%20com%20o%202%C2%BA"
          target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-primary"
        >
          <MessageCircle className="h-3.5 w-3.5" />Prefere resolver pelo WhatsApp? Fala com a gente
        </a>
      </div>
    );
  }

  if (etapa === "recusado") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger/10 text-danger">
          <XCircle className="h-7 w-7" />
        </div>
        <h1 className="font-display text-xl font-semibold text-foreground">Pagamento não aprovado</h1>
        <p className="mt-2 text-sm text-muted-foreground">Confere os dados do cartão ou tenta outro método.</p>
        <Button type="button" size="lg" pill onClick={() => setEtapa("pagamento")} className="mt-6 hover:bg-primary">Tentar de novo</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-10 px-4 py-10 lg:grid-cols-[1fr_380px]">
      <div className="flex flex-col gap-6">
        <h1 className="font-display text-section-title text-foreground">Checkout</h1>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Package className="h-3.5 w-3.5" />Retire na loja de graça ou escolha entrega abaixo</span>
          <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" />Pagamento processado com segurança pelo Mercado Pago</span>
        </div>

        {tradeInPendente && etapa === "dados" && (
          <label className="flex items-start gap-2.5 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm">
            <input type="checkbox" checked={usarTradeIn} onChange={(e) => setUsarTradeIn(e.target.checked)} className="mt-0.5 h-4 w-4 accent-primary" />
            <span>
              <span className="block font-medium text-foreground">Usar seu trade-in nesta compra</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {tradeInPendente.modeloNome} — estimativa de {formatCurrency(tradeInPendente.valorEstimado)}. Esse valor é descontado agora e cobrado num 2º pagamento, que é <strong>estornado</strong> assim que avaliarmos seu aparelho.
              </span>
            </span>
          </label>
        )}

        {etapa === "dados" && (
          <Card radius="loose" className="flex flex-col gap-3 p-6">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Seus dados</p>
            <Input
              placeholder="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)}
              aria-invalid={camposInvalidos.nome ? "true" : undefined}
              className={`h-auto rounded-xl px-3.5 py-2.5 ${camposInvalidos.nome ? "border-danger focus:border-danger" : "focus:border-primary"}`}
            />
            <Input
              placeholder="WhatsApp (DDD + número)" value={telefone} onChange={(e) => setTelefone(e.target.value)}
              aria-invalid={camposInvalidos.telefone ? "true" : undefined}
              className={`h-auto rounded-xl px-3.5 py-2.5 ${camposInvalidos.telefone ? "border-danger focus:border-danger" : "focus:border-primary"}`}
            />
            <Input
              placeholder="CPF (obrigatório)" value={cpf} onChange={(e) => setCpf(e.target.value)}
              aria-invalid={camposInvalidos.cpf ? "true" : undefined}
              className={`h-auto rounded-xl px-3.5 py-2.5 ${camposInvalidos.cpf ? "border-danger focus:border-danger" : "focus:border-primary"}`}
            />
            <p className="text-[11px] text-muted-foreground">O CPF é exigido pelo Mercado Pago pra processar o pagamento com segurança.</p>

            {regrasFrete.length > 0 && (
              <SeletorEntrega regras={regrasFrete} selecionado={entregaSelecionada} onSelecionar={setEntregaSelecionada} />
            )}

            {erro && <p className="text-xs text-danger">{erro}</p>}

            <Button type="button" size="xl" pill onClick={handleIrParaPagamento} className="mt-2">Continuar pro pagamento</Button>
          </Card>
        )}

        {etapa === "pagamento" && !gatewayAtivo && (
          <p className="rounded-2xl bg-warning-soft p-4 text-sm text-warning-text">Pagamento online está temporariamente indisponível — finaliza pelo WhatsApp na tela do carrinho.</p>
        )}

        {etapa === "pagamento" && gatewayAtivo && (
          <Card radius="loose" className="flex flex-col gap-4 p-6">
            <div className="flex gap-2">
              <Button
                type="button" variant="outline" onClick={() => { setMetodo("pix"); void import("@/components/loja/loja-tracking-provider").then(({ rastrearEventoCheckout }) => rastrearEventoCheckout("payment_selected")); }}
                className={`flex-1 gap-1.5 py-3 font-medium ${metodo === "pix" ? "border-primary bg-primary/5 text-foreground" : "text-muted-foreground"}`}
              >
                <QrCode className="h-4 w-4" />Pix
              </Button>
              <Button
                type="button" variant="outline" onClick={() => { setMetodo("cartao"); void import("@/components/loja/loja-tracking-provider").then(({ rastrearEventoCheckout }) => rastrearEventoCheckout("payment_selected")); }}
                className={`flex-1 gap-1.5 py-3 font-medium ${metodo === "cartao" ? "border-primary bg-primary/5 text-foreground" : "text-muted-foreground"}`}
              >
                <CreditCard className="h-4 w-4" />Cartão
              </Button>
            </div>

            {erro && <p className="text-xs text-danger">{erro}</p>}

            {metodo === "pix" && !dadosPix && (
              <Button type="button" size="xl" pill onClick={handlePagarPix} loading={processando} loadingText="Gerando Pix...">
                Gerar Pix
              </Button>
            )}

            {metodo === "pix" && dadosPix && (
              <PixPagamento pagamentoId={dadosPix.pagamentoId} qrCodeBase64={dadosPix.qrCodeBase64} copiaCola={dadosPix.copiaCola} expiraEm={dadosPix.expiraEm} onAprovado={handlePixAprovado} />
            )}

            {metodo === "cartao" && totalCartaoValido && (totalCartao as number) > totalComDesconto && (
              <p className="rounded-lg bg-secondary/60 p-2.5 text-[11px] text-muted-foreground">
                Pagamento no cartão: <strong>{formatCurrency(totalCartao as number)}</strong> (valor no Pix seria {formatCurrency(totalComDesconto)}).
              </p>
            )}

            {/*
              O CardPaymentBrick do Mercado Pago monta UMA vez só e
              nunca relê o `valor` depois — se ele montasse com o
              totalComDesconto (Pix) antes do totalCartao terminar de
              calcular, o cliente pagaria o valor errado (do Pix) no
              cartão pra sempre, mesmo com o texto acima mostrando o
              valor certo. Por isso só monta quando totalCartao já
              está resolvido.
            */}
            {metodo === "cartao" && publicKey && totalCartaoValido && totalFinal > 0 && (
              <>
                <p className="rounded-lg bg-secondary/60 p-2.5 text-[11px] text-muted-foreground">Parcelamento em mais de uma vez pode ter acréscimo — o valor final de cada opção aparece na confirmação, antes de você concluir o pagamento.</p>
                <CardPaymentBrick publicKey={publicKey} valor={totalFinal} onSubmit={handlePagarCartao} onErro={setErro} />
              </>
            )}
            {metodo === "cartao" && publicKey && (!totalCartaoValido || totalFinal <= 0) && <p className="text-sm text-muted-foreground">Carregando valor do pedido...</p>}
            {metodo === "cartao" && !publicKey && <p className="text-sm text-muted-foreground">Carregando...</p>}
          </Card>
        )}
      </div>

      <Card radius="loose" className="h-fit p-5">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Resumo do pedido</p>
        <div className="flex flex-col gap-2.5 border-b border-black/[0.06] pb-4">
          {itens.map((item) => (
            <div key={`${item.tipo}-${item.id}`} className="flex items-center gap-2.5 text-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary/50">
                {item.foto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.foto} alt={item.nome} className="h-full w-full object-contain" />
                ) : (
                  <Package className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <span className="flex-1 text-foreground">{item.quantidade}x {item.nome}</span>
              <span className="shrink-0 text-foreground">{formatCurrency(item.valor * item.quantidade)}</span>
            </div>
          ))}
        </div>

        <div className="border-b border-black/[0.06] py-3">
          {cupomAplicado ? (
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-success-text">Cupom {cupomAplicado.codigo} aplicado</span>
              <Button type="button" variant="link" size="sm" onClick={handleRemoverCupom} className="h-auto p-0 text-muted-foreground">Remover</Button>
            </div>
          ) : (
            <div className="flex gap-1.5">
              <Input
                placeholder="Código do cupom" value={cupomInput} onChange={(e) => setCupomInput(e.target.value.toUpperCase())}
                className="h-auto flex-1 rounded-lg px-2.5 py-1.5 text-xs focus:border-primary"
              />
              <Button type="button" variant="outline" size="sm" onClick={handleAplicarCupom} disabled={validandoCupom || !cupomInput.trim()} className="text-xs">
                {validandoCupom ? "..." : "Aplicar"}
              </Button>
            </div>
          )}
          {erroCupom && <p className="mt-1 text-xs text-danger">{erroCupom}</p>}
        </div>

        {saldoCashback > 0 && (
          <label className="flex items-center gap-2 border-b border-black/[0.06] py-3 text-xs">
            <input type="checkbox" checked={usarCashback} onChange={(e) => setUsarCashback(e.target.checked)} className="h-4 w-4 accent-primary" />
            <span className="text-foreground">Usar meu saldo de cashback (<strong className="text-success-text">{formatCurrency(saldoCashback)}</strong> disponível)</span>
          </label>
        )}

        <div className="flex flex-col gap-2 pt-2">
          {cupomAplicado && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Desconto</span>
              <span>-{formatCurrency(cupomAplicado.desconto)}</span>
            </div>
          )}

          {cashbackAplicavel > 0 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Cashback usado</span>
              <span>-{formatCurrency(cashbackAplicavel)}</span>
            </div>
          )}

          {tradeInAplicado > 0 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Trade-in ({tradeInPendente?.modeloNome})</span>
              <span>-{formatCurrency(tradeInAplicado)}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{entregaSelecionada.tipo === "retirada" ? "Retirada na loja" : `Entrega — ${regraSelecionada?.regiao}`}</span>
            <span>{valorFreteSelecionado > 0 ? formatCurrency(valorFreteSelecionado) : "Grátis"}</span>
          </div>

          {tradeInAplicado > 0 && (
            <p className="rounded-lg bg-primary/5 p-2 text-[11px] text-muted-foreground">
              + 2º pagamento de {formatCurrency(tradeInAplicado)} logo depois deste, referente ao seu aparelho (estornado após a avaliação).
            </p>
          )}

          {etapa === "pagamento" && metodo === "cartao" && totalCartaoValido && (totalCartao as number) > totalComDesconto && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Acréscimo cartão</span>
              <span>+{formatCurrency((totalCartao as number) - totalComDesconto)}</span>
            </div>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between border-t border-black/[0.06] pt-4">
          <span className="text-sm font-medium text-foreground">Total</span>
          <span className="font-display text-xl font-bold text-foreground">{formatCurrency(totalFinal)}</span>
        </div>

        <a
          href="https://wa.me/5534988178338?text=Oi!%20Tô%20com%20uma%20dúvida%20no%20checkout%20da%20loja"
          target="_blank" rel="noopener noreferrer"
          className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-primary"
        >
          <MessageCircle className="h-3.5 w-3.5" />Com dúvida? Fala com a gente no WhatsApp
        </a>
      </Card>
    </div>
  );
}
