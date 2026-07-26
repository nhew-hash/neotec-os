"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, CreditCard, QrCode } from "lucide-react";
import { useCarrinho } from "@/components/loja/carrinho-context";
import { iniciarCheckoutPixAction, pagarComCartaoAction, buscarPublicKeyMercadoPagoAction } from "@/services/pagamentos/payment.controller";
import { CardPaymentBrick } from "@/components/loja/card-payment-brick";
import { PixPagamento } from "@/components/loja/pix-pagamento";
import { formatCurrency } from "@/utils";

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

  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [gatewayAtivo, setGatewayAtivo] = useState(true);

  const [dadosPix, setDadosPix] = useState<{ pagamentoId: string; qrCodeBase64: string | null; copiaCola: string | null; expiraEm: string | null } | null>(null);

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
      return false;
    }
    return true;
  }

  async function handleIrParaPagamento() {
    setErro(null);
    if (!validarDados()) return;
    setEtapa("pagamento");
  }

  async function handlePagarPix() {
    setErro(null);
    setProcessando(true);
    const result = await iniciarCheckoutPixAction({ nomeContato: nome, telefoneContato: telefone, itens });
    setProcessando(false);

    if (!result.success) return setErro(result.error);
    setDadosPix({ pagamentoId: result.data.pagamentoId, qrCodeBase64: result.data.qrCodeBase64, copiaCola: result.data.copiaCola, expiraEm: result.data.expiraEm });
  }

  async function handlePagarCartao(dados: { token: string; installments: number; paymentMethodId: string }) {
    setErro(null);
    setProcessando(true);
    const result = await pagarComCartaoAction({
      nomeContato: nome, telefoneContato: telefone, itens,
      token: dados.token, parcelas: dados.installments, metodoPagamentoId: dados.paymentMethodId,
    });
    setProcessando(false);

    if (!result.success) return setErro(result.error);
    if (result.data.status === "aprovado") {
      limpar();
      setEtapa("aprovado");
    } else if (result.data.status === "recusado") {
      setEtapa("recusado");
    } else {
      // pendente/em análise — cartão raramente fica pendente, mas trata com honestidade se acontecer
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
        <p className="text-[15px] text-foreground">Seu carrinho está vazio.</p>
        <Link href="/loja" className="mt-4 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white">Ver produtos</Link>
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
        <Link href="/loja" className="mt-6 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white">Voltar pra loja</Link>
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
        <button type="button" onClick={() => setEtapa("pagamento")} className="mt-6 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white">Tentar de novo</button>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-10 px-4 py-10 lg:grid-cols-[1fr_380px]">
      <div className="flex flex-col gap-6">
        <h1 className="font-display text-2xl font-semibold text-foreground">Checkout</h1>

        {etapa === "dados" && (
          <div className="flex flex-col gap-3 rounded-2xl border border-black/[0.06] p-6">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Seus dados</p>
            <input placeholder="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} className="rounded-xl border border-black/[0.08] px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
            <input placeholder="WhatsApp (DDD + número)" value={telefone} onChange={(e) => setTelefone(e.target.value)} className="rounded-xl border border-black/[0.08] px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
            <input placeholder="CPF (opcional)" value={cpf} onChange={(e) => setCpf(e.target.value)} className="rounded-xl border border-black/[0.08] px-3.5 py-2.5 text-sm outline-none focus:border-primary" />

            {erro && <p className="text-xs text-danger">{erro}</p>}

            <button type="button" onClick={handleIrParaPagamento} className="mt-2 rounded-full bg-primary py-3.5 text-sm font-semibold text-white">Continuar pro pagamento</button>
          </div>
        )}

        {etapa === "pagamento" && !gatewayAtivo && (
          <p className="rounded-2xl bg-warning-soft p-4 text-sm text-warning">Pagamento online está temporariamente indisponível — finaliza pelo WhatsApp na tela do carrinho.</p>
        )}

        {etapa === "pagamento" && gatewayAtivo && (
          <div className="flex flex-col gap-4 rounded-2xl border border-black/[0.06] p-6">
            <div className="flex gap-2">
              <button type="button" onClick={() => setMetodo("pix")} className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-3 text-sm font-medium ${metodo === "pix" ? "border-primary bg-primary/5 text-foreground" : "border-black/[0.08] text-muted-foreground"}`}>
                <QrCode className="h-4 w-4" />Pix
              </button>
              <button type="button" onClick={() => setMetodo("cartao")} className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-3 text-sm font-medium ${metodo === "cartao" ? "border-primary bg-primary/5 text-foreground" : "border-black/[0.08] text-muted-foreground"}`}>
                <CreditCard className="h-4 w-4" />Cartão
              </button>
            </div>

            {erro && <p className="text-xs text-danger">{erro}</p>}

            {metodo === "pix" && !dadosPix && (
              <button type="button" onClick={handlePagarPix} disabled={processando} className="rounded-full bg-primary py-3.5 text-sm font-semibold text-white disabled:opacity-60">
                {processando ? "Gerando Pix..." : "Gerar Pix"}
              </button>
            )}

            {metodo === "pix" && dadosPix && (
              <PixPagamento pagamentoId={dadosPix.pagamentoId} qrCodeBase64={dadosPix.qrCodeBase64} copiaCola={dadosPix.copiaCola} expiraEm={dadosPix.expiraEm} onAprovado={handlePixAprovado} />
            )}

            {metodo === "cartao" && publicKey && total > 0 && (
              <CardPaymentBrick publicKey={publicKey} valor={total} onSubmit={handlePagarCartao} onErro={setErro} />
            )}
            {metodo === "cartao" && publicKey && total <= 0 && <p className="text-sm text-muted-foreground">Carregando valor do pedido...</p>}
            {metodo === "cartao" && !publicKey && <p className="text-sm text-muted-foreground">Carregando...</p>}
          </div>
        )}
      </div>

      <div className="h-fit rounded-2xl border border-black/[0.06] bg-[#FAFBFC] p-5">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Resumo do pedido</p>
        <div className="flex flex-col gap-2 border-b border-black/[0.06] pb-4">
          {itens.map((item) => (
            <div key={`${item.tipo}-${item.id}`} className="flex justify-between text-sm">
              <span className="text-foreground">{item.quantidade}x {item.nome}</span>
              <span className="text-foreground">{formatCurrency(item.valor * item.quantidade)}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between pt-4">
          <span className="text-sm font-medium text-foreground">Total</span>
          <span className="font-display text-xl font-bold text-foreground">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}
