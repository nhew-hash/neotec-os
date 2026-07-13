"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { finalizarVendaPDVAction } from "@/services/vendas/pdv.actions";
import { formatCurrency } from "@/utils";
import type { PdvItemValues, PdvVendaValues } from "@/services/vendas/pdv.schema";
import type { Cliente, Produto } from "@/types";
import type { AparelhoComProduto } from "@/services/estoque/estoque.service";

const FORMAS_PAGAMENTO = [
  { value: "pix", label: "Pix" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao_credito", label: "Cartão de crédito" },
  { value: "cartao_debito", label: "Cartão de débito" },
  { value: "boleto", label: "Boleto" },
  { value: "misto", label: "Misto" },
] as const;

interface PdvCartProps {
  clientes: Cliente[];
  produtos: Produto[];
  aparelhos: AparelhoComProduto[];
}

export function PdvCart({ clientes, produtos, aparelhos }: PdvCartProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const [itens, setItens] = useState<PdvItemValues[]>([]);
  const [clienteId, setClienteId] = useState<string>("");
  const [formaPagamento, setFormaPagamento] = useState<string>("pix");
  const [desconto, setDesconto] = useState<number>(0);

  const aparelhosDisponiveis = aparelhos.filter(
    (a) => a.status === "disponivel" && !itens.some((i) => i.tipo === "aparelho" && i.id === a.id)
  );

  const total = useMemo(
    () => Math.max(0, itens.reduce((acc, i) => acc + i.valor * i.quantidade, 0) - desconto),
    [itens, desconto]
  );

  function adicionarAparelho(aparelhoId: string) {
    const aparelho = aparelhos.find((a) => a.id === aparelhoId);
    if (!aparelho) return;
    setItens((prev) => [
      ...prev,
      {
        tipo: "aparelho",
        id: aparelho.id,
        nome: `${aparelho.produto?.nome ?? "Aparelho"} — ${aparelho.imei}`,
        quantidade: 1,
        valor: aparelho.preco_venda ?? 0,
      },
    ]);
  }

  function adicionarProduto(produtoId: string) {
    const produto = produtos.find((p) => p.id === produtoId);
    if (!produto) return;
    const existente = itens.find((i) => i.tipo === "produto" && i.id === produtoId);
    if (existente) {
      setItens((prev) => prev.map((i) => (i === existente ? { ...i, quantidade: i.quantidade + 1 } : i)));
      return;
    }
    setItens((prev) => [
      ...prev,
      { tipo: "produto", id: produto.id, nome: produto.nome, quantidade: 1, valor: produto.preco_venda ?? 0 },
    ]);
  }

  function removerItem(index: number) {
    setItens((prev) => prev.filter((_, i) => i !== index));
  }

  function atualizarItem(index: number, campo: "quantidade" | "valor", valor: number) {
    setItens((prev) => prev.map((item, i) => (i === index ? { ...item, [campo]: valor } : item)));
  }

  function handleFinalizar() {
    setErro(null);
    if (itens.length === 0) return setErro("Adicione pelo menos um item à venda");

    startTransition(async () => {
      const payload: PdvVendaValues = {
        cliente_id: clienteId || undefined,
        forma_pagamento: formaPagamento as PdvVendaValues["forma_pagamento"],
        desconto,
        itens,
      };
      const result = await finalizarVendaPDVAction(payload);

      if (!result.success) return setErro(result.error);
      router.push(`/vendas/${result.data.vendaId}`);
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-4">
        <Card>
          <CardContent className="flex flex-col gap-3 p-4">
            <p className="text-xs font-medium text-muted-foreground">Adicionar aparelho do estoque</p>
            <Select onValueChange={adicionarAparelho} value="">
              <SelectTrigger><SelectValue placeholder="Selecione um aparelho disponível" /></SelectTrigger>
              <SelectContent>
                {aparelhosDisponiveis.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.produto?.nome} — {a.imei} {a.preco_venda ? `(${formatCurrency(a.preco_venda)})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <p className="mt-2 text-xs font-medium text-muted-foreground">Adicionar produto / acessório</p>
            <Select onValueChange={adicionarProduto} value="">
              <SelectTrigger><SelectValue placeholder="Selecione um produto" /></SelectTrigger>
              <SelectContent>
                {produtos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome} {p.preco_venda ? `(${formatCurrency(p.preco_venda)})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-2 p-4">
            <p className="text-xs font-medium text-muted-foreground">Carrinho</p>
            {itens.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhum item adicionado ainda.</p>
            )}
            {itens.map((item, index) => (
              <div key={`${item.tipo}-${item.id}-${index}`} className="flex items-center gap-2 rounded-md border border-border p-2">
                <span className="flex-1 truncate text-sm text-foreground">{item.nome}</span>
                {item.tipo === "produto" && (
                  <Input
                    type="number" min={1} value={item.quantidade}
                    onChange={(e) => atualizarItem(index, "quantidade", Number(e.target.value) || 1)}
                    className="h-8 w-16 text-xs"
                  />
                )}
                <Input
                  type="number" step="0.01" value={item.valor}
                  onChange={(e) => atualizarItem(index, "valor", Number(e.target.value) || 0)}
                  className="h-8 w-24 text-xs"
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => removerItem(index)}>
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="h-fit">
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Cliente (opcional — venda avulsa se vazio)</label>
            <Select onValueChange={setClienteId} value={clienteId}>
              <SelectTrigger><SelectValue placeholder="Venda avulsa (sem cliente)" /></SelectTrigger>
              <SelectContent>
                {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Forma de pagamento</label>
            <Select onValueChange={setFormaPagamento} value={formaPagamento}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FORMAS_PAGAMENTO.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Desconto (opcional)</label>
            <Input type="number" step="0.01" value={desconto} onChange={(e) => setDesconto(Number(e.target.value) || 0)} />
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-sm font-medium text-foreground">Total</span>
            <span className="font-display text-xl font-semibold text-foreground">{formatCurrency(total)}</span>
          </div>

          {erro && <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{erro}</p>}

          <Button onClick={handleFinalizar} disabled={isPending || itens.length === 0} size="lg">
            {isPending ? "Finalizando..." : "Finalizar venda"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
