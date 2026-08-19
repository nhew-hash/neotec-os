"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, CreditCard, QrCode } from "lucide-react";
import { useCarrinho } from "@/components/loja/carrinho-context";
import { iniciarCheckoutPixAction, pagarComCartaoAction, buscarPublicKeyMercadoPagoAction, consultarSaldoCashbackPorTelefoneAction } from "@/services/pagamentos/payment.controller";
import { validarCupomAction } from "@/services/loja/cupom.actions";
import { calcularDescontoCupom } from "@/services/loja/cupom.utils";
import { CardPaymentBrick } from "@/components/loja/card-payment-brick";
import { PixPagamento } from "@/components/loja/pix-pagamento";
import { formatCurrency } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

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

  const [dadosPix, setDadosPix] = useState<{ pagamentoId: string; qrCodeBase64: string | null; copiaCola: string | null; expiraEm: string | null } | null>(null);
  const [cupomInput, setCupomInput] = useState("");
  const [cupomAplicado, setCupomAplicado] = useState<{ codigo: string; desconto: number } | null>(null);
  const [validandoCupom, setValidandoCupom] = useState(false);
  const [erroCupom, setErroCupom] = useState<string | null>(null);
  const [saldoCashback, setSaldoCashback] = useState(0);
  const [usarCashback, setUsarCashback] = useState(false);

  const totalAposCupom = Math.max(0, total - (cupomAplicado?.desconto ?? 0));
  const cashbackAplicavel = usarCashback ? Math.min(saldoCashback, totalAposCupom) : 0;
  const totalComDesconto = Math.max(0, totalAposCupom - cashbackAplicavel);

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
    const result = await iniciarCheckoutPixAction({ nomeContato: nome, telefoneContato: telefone, itens, cpf: cpf.trim() || undefined, cupomCodigo: cupomAplicado?.codigo, usarCashback: cashbackAplicavel });
    setProcessando(false);

    if (!result.success) return setErro(result.error);
    setDadosPix({ pagamentoId: result.data.pagamentoId, qrCodeBase64: result.data.qrCodeBase64, copiaCola: result.data.copiaCola, expiraEm: result.data.expiraEm });
  }

  async function handlePagarCartao(dados: { token: string; installments: number; paymentMethodId: string }) {
    setErro(null);
    setProcessando(true);
    const result = await pagarComCartaoAction({
      nomeContato: nome, telefoneContato: telefone, itens,
      token: dados.token, parcelas: dados.installments, metodoPagamentoId: dados.paymentMethodId, cpf: cpf.trim() || undefined, cupomCodigo: cupomAplicado?.codigo, usarCashback: cashbackAplicavel,
    });
    setProcessando(false);

    if (!result.success) return setErro(result.error);
    if (result.data.status === "aprovado") {
      limpar();
      setEtapa("aprovado");
    } else if (result.data.status === "recusado") {
      setEtapa("recusado");
    } else {
      setErro("Pagamento em análise — você recebe a confirmação assim que o Mercado Pago processar.");
    }
  }

  function handlePixAprovado() {
    limpar();
    setEtapa("aprovado");
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
                type="button" variant="outline" onClick={() => setMetodo("pix")}
                className={`flex-1 gap-1.5 py-3 font-medium ${metodo === "pix" ? "border-primary bg-primary/5 text-foreground" : "text-muted-foreground"}`}
              >
                <QrCode className="h-4 w-4" />Pix
              </Button>
              <Button
                type="button" variant="outline" onClick={() => setMetodo("cartao")}
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
              <CardPaymentBrick publicKey={publicKey} valor={totalComDesconto} onSubmit={handlePagarCartao} onErro={setErro} />
            )}
            {metodo === "cartao" && publicKey && totalComDesconto <= 0 && <p className="text-sm text-muted-foreground">Carregando valor do pedido...</p>}
            {metodo === "cartao" && !publicKey && <p className="text-sm text-muted-foreground">Carregando...</p>}
          </Card>
        )}
      </div>

      <Card radius="loose" className="h-fit bg-[#FAFBFC] p-5">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Resumo do pedido</p>
        <div className="flex flex-col gap-2 border-b border-black/[0.06] pb-4">
          {itens.map((item) => (
            <div key={`${item.tipo}-${item.id}`} className="flex justify-between text-sm">
              <span className="text-foreground">{item.quantidade}x {item.nome}</span>
              <span className="text-foreground">{formatCurrency(item.valor * item.quantidade)}</span>
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
        </div>

        <div className="mt-2 flex items-center justify-between border-t border-black/[0.06] pt-4">
          <span className="text-sm font-medium text-foreground">Total</span>
          <span className="font-display text-xl font-bold text-foreground">{formatCurrency(totalComDesconto)}</span>
        </div>
      </Card>
    </div>
  );
}
