"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, CreditCard, QrCode, Package, ShieldCheck, MessageCircle } from "lucide-react";
import { useCarrinho } from "@/components/loja/carrinho-context";
import { iniciarCheckoutPixAction, pagarComCartaoAction, buscarPublicKeyMercadoPagoAction, consultarSaldoCashbackPorTelefoneAction } from "@/services/pagamentos/payment.controller";
import { validarCupomAction } from "@/services/loja/cupom.actions";
import { calcularDescontoCupom } from "@/services/loja/cupom.utils";
import { CardPaymentBrick } from "@/components/loja/card-payment-brick";
import { PixPagamento } from "@/components/loja/pix-pagamento";
import { SeletorEntrega } from "@/components/loja/seletor-entrega";
import { listarRegrasFretePublicoAction } from "@/services/loja-admin/central-loja.actions";
import { formatCurrency } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import type { RegraFrete } from "@/types";

type MetodoPagamento = "pix" | "cartao";
type EtapaCheckout = "dados" | "pagamento" | "aprovado" | "recusado";

export default function CheckoutPage() {
  const { itens, total, limpar } = useCarrinho();
  const [etapa, setEtapa] = useState<EtapaCheckout>("dados");
  const [metodo, setMetodo] = useState<MetodoPagamento>("pix");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [camposInvalidos, setCamposInvalidos] = useState<{ nome?: boolean; telefone?: boolean }>({});

  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [gatewayAtivo, setGatewayAtivo] = useState(true);
  const [regrasFrete, setRegrasFrete] = useState<Pick<RegraFrete, "id" | "regiao" | "valor" | "prazo_dias_uteis">[]>([]);
  const [entregaSelecionada, setEntregaSelecionada] = useState<{ tipo: "retirada" } | { tipo: "entrega"; regiaoId: string }>({ tipo: "retirada" });

  const [dadosPix, setDadosPix] = useState<{ pagamentoId: string; qrCodeBase64: string | null; copiaCola: string | null; expiraEm: string | null } | null>(null);
  const [cupomInput, setCupomInput] = useState("");
  const [cupomAplicado, setCupomAplicado] = useState<{ codigo: string; desconto: number } | null>(null);
  const [validandoCupom, setValidandoCupom] = useState(false);
  const [erroCupom, setErroCupom] = useState<string | null>(null);
  const [saldoCashback, setSaldoCashback] = useState(0);
  const [usarCashback, setUsarCashback] = useState(false);

  const totalAposCupom = Math.max(0, total - (cupomAplicado?.desconto ?? 0));
  const cashbackAplicavel = usarCashback ? Math.min(saldoCashback, totalAposCupom) : 0;
  const regraSelecionada = entregaSelecionada.tipo === "entrega" ? regrasFrete.find((r) => r.id === entregaSelecionada.regiaoId) : null;
  const valorFreteSelecionado = regraSelecionada?.valor ?? 0;
  const totalComDesconto = Math.max(0, totalAposCupom - cashbackAplicavel) + valorFreteSelecionado;

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

  useEffect(() => {
    if (itens.length === 0) return;
    void import("@/components/loja/loja-tracking-provider").then(({ rastrearEventoCheckout }) => rastrearEventoCheckout("checkout_view"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function validarDados(): boolean {
    if (!nome.trim() || !telefone.trim()) {
      setErro("Informe nome e telefone");
      setCamposInvalidos({ nome: !nome.trim(), telefone: !telefone.trim() });
      return false;
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
      tipoEntrega: entregaSelecionada.tipo, regiaoEntrega: regraSelecionada?.regiao, valorFrete: valorFreteSelecionado,
    });
    setProcessando(false);

    if (!result.success) {
      void import("@/components/loja/loja-tracking-provider").then(({ rastrearEventoCheckout }) => rastrearEventoCheckout("payment_failed"));
      return setErro(result.error);
    }
    setDadosPix({ pagamentoId: result.data.pagamentoId, qrCodeBase64: result.data.qrCodeBase64, copiaCola: result.data.copiaCola, expiraEm: result.data.expiraEm });
  }

  async function handlePagarCartao(dados: { token: string; installments: number; paymentMethodId: string }) {
    setErro(null);
    setProcessando(true);
    const result = await pagarComCartaoAction({
      nomeContato: nome, telefoneContato: telefone, itens,
      token: dados.token, parcelas: dados.installments, metodoPagamentoId: dados.paymentMethodId, cpf: cpf.trim() || undefined, cupomCodigo: cupomAplicado?.codigo, usarCashback: cashbackAplicavel,
      tipoEntrega: entregaSelecionada.tipo, regiaoEntrega: regraSelecionada?.regiao, valorFrete: valorFreteSelecionado,
    });
    setProcessando(false);

    if (!result.success) return setErro(result.error);
    if (result.data.status === "aprovado") {
      limpar();
      setEtapa("aprovado");
      void import("@/components/loja/loja-tracking-provider").then(({ rastrearEventoCheckout }) => rastrearEventoCheckout("payment_success"));
    } else if (result.data.status === "recusado") {
      setEtapa("recusado");
      void import("@/components/loja/loja-tracking-provider").then(({ rastrearEventoCheckout }) => rastrearEventoCheckout("payment_failed"));
    } else {
      setErro("Pagamento em análise — você recebe a confirmação assim que o Mercado Pago processar.");
    }
  }

  function handlePixAprovado() {
    limpar();
    setEtapa("aprovado");
    void import("@/components/loja/loja-tracking-provider").then(({ rastrearEventoCheckout }) => rastrearEventoCheckout("payment_success"));
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
        <Button asChild size="lg" pill className="mt-6 hover:bg-primary">
          <Link href="/loja">Voltar pra loja</Link>
        </Button>
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
            <Input placeholder="CPF (recomendado — ajuda a aprovar o pagamento mais rápido)" value={cpf} onChange={(e) => setCpf(e.target.value)} className="h-auto rounded-xl px-3.5 py-2.5 focus:border-primary" />

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

            {metodo === "cartao" && publicKey && totalComDesconto > 0 && (
              <>
                <p className="rounded-lg bg-secondary/60 p-2.5 text-[11px] text-muted-foreground">Parcelamento em mais de uma vez pode ter acréscimo — o valor final de cada opção aparece na confirmação, antes de você concluir o pagamento.</p>
                <CardPaymentBrick publicKey={publicKey} valor={totalComDesconto} onSubmit={handlePagarCartao} onErro={setErro} />
              </>
            )}
            {metodo === "cartao" && publicKey && totalComDesconto <= 0 && <p className="text-sm text-muted-foreground">Carregando valor do pedido...</p>}
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

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{entregaSelecionada.tipo === "retirada" ? "Retirada na loja" : `Entrega — ${regraSelecionada?.regiao}`}</span>
            <span>{valorFreteSelecionado > 0 ? formatCurrency(valorFreteSelecionado) : "Grátis"}</span>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between border-t border-black/[0.06] pt-4">
          <span className="text-sm font-medium text-foreground">Total</span>
          <span className="font-display text-xl font-bold text-foreground">{formatCurrency(totalComDesconto)}</span>
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
