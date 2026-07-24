"use client";

import { useState } from "react";
import Link from "next/link";
import { Trash2, Minus, Plus, MessageCircle, CreditCard } from "lucide-react";
import { useCarrinho } from "@/components/loja/carrinho-context";
import { criarPedidoLojaAction } from "@/services/loja/loja-pedido.actions";
import { formatCurrency } from "@/utils";

export default function CarrinhoPage() {
  const { itens, remover, atualizarQuantidade, total, limpar } = useCarrinho();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleFinalizarWhatsapp() {
    setErro(null);
    if (!nome.trim() || !telefone.trim()) return setErro("Informe seu nome e WhatsApp pra gente confirmar o pedido");

    setEnviando(true);
    const result = await criarPedidoLojaAction({
      nomeContato: nome,
      telefoneContato: telefone,
      itens,
      origemFechamento: "whatsapp",
    });
    setEnviando(false);

    if (!result.success) return setErro(result.error);

    const listaItens = itens.map((i) => `• ${i.quantidade}x ${i.nome}${i.detalhe ? ` (${i.detalhe})` : ""} — ${formatCurrency(i.valor * i.quantidade)}`).join("\n");
    const mensagem = `Olá! Quero fechar esse pedido (#${result.data.pedidoId.slice(0, 8)}):\n\n${listaItens}\n\nTotal: ${formatCurrency(total)}\n\nMeu nome: ${nome}`;

    limpar();
    window.location.href = `https://wa.me/5534999999999?text=${encodeURIComponent(mensagem)}`;
  }

  if (itens.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
        <p className="text-[15px] text-foreground">Seu carrinho está vazio.</p>
        <Link href="/loja" className="mt-4 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white">Ver produtos</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-8 px-4 py-10 lg:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-xl font-semibold text-foreground">Seu carrinho</h1>
        {itens.map((item) => (
          <div key={`${item.tipo}-${item.id}`} className="flex items-center gap-3 rounded-2xl border border-black/[0.06] p-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{item.nome}</p>
              {item.detalhe && <p className="text-xs text-muted-foreground">{item.detalhe}</p>}
              <p className="mt-1 text-sm font-semibold text-foreground">{formatCurrency(item.valor)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => atualizarQuantidade(item.tipo, item.id, item.quantidade - 1)} className="flex h-7 w-7 items-center justify-center rounded-full border border-black/[0.08] hover:bg-secondary">
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-5 text-center text-sm">{item.quantidade}</span>
              <button type="button" onClick={() => atualizarQuantidade(item.tipo, item.id, item.quantidade + 1)} className="flex h-7 w-7 items-center justify-center rounded-full border border-black/[0.08] hover:bg-secondary">
                <Plus className="h-3 w-3" />
              </button>
            </div>
            <button type="button" onClick={() => remover(item.tipo, item.id)} className="text-danger">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="h-fit rounded-2xl border border-black/[0.06] bg-[#FAFBFC] p-5">
        <div className="mb-4 flex items-center justify-between border-b border-black/[0.06] pb-4">
          <span className="text-sm font-medium text-foreground">Total</span>
          <span className="font-display text-xl font-bold text-foreground">{formatCurrency(total)}</span>
        </div>

        <div className="flex flex-col gap-2.5">
          <input placeholder="Seu nome" value={nome} onChange={(e) => setNome(e.target.value)} className="rounded-xl border border-black/[0.08] px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
          <input placeholder="WhatsApp (DDD + número)" value={telefone} onChange={(e) => setTelefone(e.target.value)} className="rounded-xl border border-black/[0.08] px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
          {erro && <p className="text-xs text-danger">{erro}</p>}

          <button
            type="button"
            onClick={handleFinalizarWhatsapp}
            disabled={enviando}
            className="mt-1 flex items-center justify-center gap-2 rounded-full bg-[#25D366] py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#25D366]/20 transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            <MessageCircle className="h-4 w-4" />{enviando ? "Enviando..." : "Finalizar pelo WhatsApp"}
          </button>

          <button
            type="button"
            disabled
            title="Em breve"
            className="flex items-center justify-center gap-2 rounded-full border border-black/[0.08] py-3.5 text-sm font-semibold text-muted-foreground opacity-60"
          >
            <CreditCard className="h-4 w-4" />Pagar com Pix ou cartão (em breve)
          </button>
        </div>
      </div>
    </div>
  );
}
