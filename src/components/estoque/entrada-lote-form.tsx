"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { registrarEntradaLoteAction } from "@/services/estoque/entrada-lote.actions";
import type { ItemEntradaLoteValues, EntradaLoteValues } from "@/services/estoque/entrada-lote.schema";
import type { Produto } from "@/types";

export function EntradaLoteForm({ produtos }: { produtos: Produto[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<number | null>(null);

  const [fornecedor, setFornecedor] = useState("");
  const [itens, setItens] = useState<ItemEntradaLoteValues[]>([]);

  function adicionarProduto(produtoId: string) {
    const produto = produtos.find((p) => p.id === produtoId);
    if (!produto) return;
    setItens((prev) => [
      ...prev,
      { produto_id: produto.id, nome: produto.nome, quantidade: 1, custo_unitario: produto.custo ?? undefined },
    ]);
  }

  function atualizarItem(index: number, campo: "quantidade" | "custo_unitario", valor: number) {
    setItens((prev) => prev.map((item, i) => (i === index ? { ...item, [campo]: valor } : item)));
  }

  function removerItem(index: number) {
    setItens((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSalvar() {
    setErro(null);
    setSucesso(null);
    if (itens.length === 0) return setErro("Adicione pelo menos um produto");

    startTransition(async () => {
      const payload: EntradaLoteValues = { fornecedor: fornecedor || undefined, itens };
      const result = await registrarEntradaLoteAction(payload);
      if (!result.success) return setErro(result.error);
      setSucesso(result.data.quantidade);
      setItens([]);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Fornecedor (opcional)</label>
            <Input value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} placeholder="Ex: Distribuidora XYZ" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Adicionar produto</label>
            <Select onValueChange={adicionarProduto} value="">
              <SelectTrigger><SelectValue placeholder="Selecione um produto do catálogo" /></SelectTrigger>
              <SelectContent>
                {produtos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-2 p-4">
          <p className="text-xs font-medium text-muted-foreground">
            {itens.length} item(ns) nesta entrada
          </p>
          {itens.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum item adicionado ainda. Selecione produtos acima, um de cada vez.
            </p>
          )}
          {itens.map((item, index) => (
            <div key={`${item.produto_id}-${index}`} className="flex flex-wrap items-center gap-2 rounded-md border border-border p-2">
              <span className="min-w-[140px] flex-1 truncate text-sm text-foreground">{item.nome}</span>
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] text-muted-foreground">Quantidade</label>
                <Input
                  type="number" min={1} value={item.quantidade}
                  onChange={(e) => atualizarItem(index, "quantidade", Number(e.target.value) || 1)}
                  className="h-8 w-20 text-xs"
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] text-muted-foreground">Custo unitário</label>
                <Input
                  type="number" step="0.01" value={item.custo_unitario ?? ""}
                  onChange={(e) => atualizarItem(index, "custo_unitario", Number(e.target.value) || 0)}
                  className="h-8 w-24 text-xs"
                />
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => removerItem(index)}>
                <Trash2 className="h-4 w-4 text-danger" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {erro && <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{erro}</p>}
      {sucesso != null && (
        <p className="rounded-md bg-success-soft px-3 py-2 text-sm text-success">
          {sucesso} item(ns) registrado(s) com sucesso. Pode continuar adicionando mais, ou voltar ao estoque.
        </p>
      )}

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.push("/estoque")}>Voltar ao estoque</Button>
        <Button onClick={handleSalvar} disabled={isPending || itens.length === 0}>
          {isPending ? "Salvando..." : "Registrar entrada"}
        </Button>
      </div>
    </div>
  );
}
