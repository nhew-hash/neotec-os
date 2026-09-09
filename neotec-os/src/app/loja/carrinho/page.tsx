"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, Minus, Plus, MessageCircle, CreditCard, Package } from "lucide-react";
import { useCarrinho } from "@/components/loja/carrinho-context";
import { criarPedidoLojaAction } from "@/services/loja/loja-pedido.actions";
import { formatCurrency } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function CarrinhoPage() {
  const router = useRouter();
  const { itens, remover, atualizarQuantidade, total, limpar } = useCarrinho();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [camposInvalidos, setCamposInvalidos] = useState<{ nome?: boolean; telefone?: boolean }>({});

  async function handleFinalizarWhatsapp() {
    setErro(null);
    if (!nome.trim() || !telefone.trim()) {
      setCamposInvalidos({ nome: !nome.trim(), telefone: !telefone.trim() });
      return setErro("Informe seu nome e WhatsApp pra gente confirmar o pedido");
    }
    setCamposInvalidos({});

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
    window.location.href = `https://wa.me/5534988178338?text=${encodeURIComponent(mensagem)}`;
  }

  if (itens.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
        <p className="text-sm text-foreground">Seu carrinho está vazio.</p>
        <Button asChild size="lg" pill className="mt-4 hover:bg-primary">
          <Link href="/loja">Ver produtos</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-8 px-4 py-10 lg:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-xl font-semibold text-foreground">Seu carrinho</h1>
        {itens.map((item) => (
          <Card key={`${item.tipo}-${item.id}`} radius="loose" className="flex items-center gap-3 p-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-secondary/50">
              {item.foto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.foto} alt={item.nome} className="h-full w-full object-contain" />
              ) : (
                <Package className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{item.nome}</p>
              {item.detalhe && <p className="text-xs text-muted-foreground">{item.detalhe}</p>}
              <p className="mt-1 text-sm font-semibold text-foreground">{formatCurrency(item.valor)}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="icon" pill className="h-7 w-7" onClick={() => atualizarQuantidade(item.tipo, item.id, item.quantidade - 1)}>
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-5 text-center text-sm">{item.quantidade}</span>
              <Button type="button" variant="outline" size="icon" pill className="h-7 w-7" onClick={() => atualizarQuantidade(item.tipo, item.id, item.quantidade + 1)}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <Button type="button" variant="ghost" size="icon" pill className="h-8 w-8 text-danger hover:bg-danger/10 hover:text-danger" onClick={() => remover(item.tipo, item.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </Card>
        ))}
      </div>

      <Card radius="loose" className="h-fit p-5">
        <div className="mb-4 flex items-center justify-between border-b border-black/[0.06] pb-4">
          <span className="text-sm font-medium text-foreground">Total</span>
          <span className="font-display text-xl font-bold text-foreground">{formatCurrency(total)}</span>
        </div>

        <div className="flex flex-col gap-2.5">
          <Input
            placeholder="Seu nome" value={nome} onChange={(e) => setNome(e.target.value)}
            aria-invalid={camposInvalidos.nome ? "true" : undefined}
            className={`h-auto rounded-xl px-3.5 py-2.5 ${camposInvalidos.nome ? "border-danger focus:border-danger" : "focus:border-primary"}`}
          />
          <Input
            placeholder="WhatsApp (DDD + número)" value={telefone} onChange={(e) => setTelefone(e.target.value)}
            aria-invalid={camposInvalidos.telefone ? "true" : undefined}
            className={`h-auto rounded-xl px-3.5 py-2.5 ${camposInvalidos.telefone ? "border-danger focus:border-danger" : "focus:border-primary"}`}
          />
          {erro && <p className="text-xs text-danger">{erro}</p>}

          <Button
            type="button" variant="whatsapp" size="xl" pill
            onClick={handleFinalizarWhatsapp}
            loading={enviando} loadingText="Enviando..."
            className="mt-1 shadow-lg shadow-[#25D366]/20"
          >
            <MessageCircle className="h-4 w-4" />Finalizar pelo WhatsApp
          </Button>

          <Button
            type="button" variant="outline" size="xl" pill
            onClick={() => router.push("/loja/checkout")}
            className="border-primary text-primary hover:bg-primary/5 hover:text-primary"
          >
            <CreditCard className="h-4 w-4" />Pagar com Pix ou cartão
          </Button>
        </div>
      </Card>
    </div>
  );
}
