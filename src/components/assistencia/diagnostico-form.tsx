"use client";

import { useState, useTransition } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { salvarDiagnosticoAction, adicionarPecaOSAction } from "@/services/assistencia/assistencia.actions";
import { formatCurrency } from "@/utils";
import type { Produto } from "@/types";
import type { PecaOSComProduto } from "@/services/assistencia/assistencia.service";

export function DiagnosticoForm({ osId, diagnosticoInicial }: { osId: string; diagnosticoInicial: string | null }) {
  const [isPending, startTransition] = useTransition();
  const [mensagem, setMensagem] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setMensagem(null);
    startTransition(async () => {
      const result = await salvarDiagnosticoAction(osId, formData);
      setMensagem(result.success ? "Diagnóstico salvo." : result.error);
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-3">
      <Textarea name="diagnostico" placeholder="Descreva o diagnóstico técnico" defaultValue={diagnosticoInicial ?? ""} />
      <Input name="valor" type="number" step="0.01" placeholder="Valor do orçamento do reparo" />
      {mensagem && <p className="text-xs text-muted-foreground">{mensagem}</p>}
      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Salvando..." : "Salvar diagnóstico"}
      </Button>
    </form>
  );
}

export function PecasOSForm({ osId, produtos, pecas }: { osId: string; produtos: Produto[]; pecas: PecaOSComProduto[] }) {
  const [isPending, startTransition] = useTransition();
  const [mensagem, setMensagem] = useState<string | null>(null);
  const pecasDisponiveis = produtos.filter((p) => p.categoria === "peca" || p.categoria === "acessorio");

  function handleSubmit(formData: FormData) {
    setMensagem(null);
    startTransition(async () => {
      const result = await adicionarPecaOSAction(osId, formData);
      setMensagem(result.success ? "Peça adicionada e debitada do estoque." : result.error);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {pecas.map((peca) => (
          <div key={peca.id} className="flex items-center justify-between rounded-md border border-border p-2 text-sm">
            <span>{peca.produto.nome} × {peca.quantidade}</span>
            <span className="text-muted-foreground">{formatCurrency(peca.custo)}</span>
          </div>
        ))}
        {pecas.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma peça registrada ainda.</p>}
      </div>

      <form action={handleSubmit} className="flex items-end gap-2">
        <div className="flex-1">
          <Select name="produto_id">
            <SelectTrigger><SelectValue placeholder="Selecione a peça" /></SelectTrigger>
            <SelectContent>
              {pecasDisponiveis.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Input name="quantidade" type="number" defaultValue={1} min={1} className="w-20" />
        <Button type="submit" disabled={isPending}>{isPending ? "..." : "Adicionar"}</Button>
      </form>
      {mensagem && <p className="text-xs text-muted-foreground">{mensagem}</p>}
    </div>
  );
}
