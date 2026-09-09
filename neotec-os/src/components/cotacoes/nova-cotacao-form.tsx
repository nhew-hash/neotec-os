"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { interpretarCotacaoAction, salvarCotacaoAction } from "@/services/cotacoes/cotacoes.actions";
import { CATEGORIAS_SUGERIDAS } from "@/services/cotacoes/cotacoes.schema";
import { formatCurrency } from "@/utils";
import type { CotacaoItemFormValues } from "@/services/cotacoes/cotacoes.schema";

type Etapa = "colar" | "interpretando" | "revisar";

export function NovaCotacaoForm({ fornecedoresExistentes }: { fornecedoresExistentes: string[] }) {
  const router = useRouter();
  const [etapa, setEtapa] = useState<Etapa>("colar");
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [avisoItensDescartados, setAvisoItensDescartados] = useState<number | null>(null);

  const [fornecedor, setFornecedor] = useState("");
  const [categoria, setCategoria] = useState(CATEGORIAS_SUGERIDAS[0]);
  const [dataCotacao, setDataCotacao] = useState(() => new Date().toISOString().slice(0, 10));
  const [observacao, setObservacao] = useState("");
  const [textoOriginal, setTextoOriginal] = useState("");
  const [itens, setItens] = useState<CotacaoItemFormValues[]>([]);

  function handleInterpretar() {
    setErro(null);
    if (!fornecedor.trim()) return setErro("Informe o fornecedor antes de interpretar");
    if (!textoOriginal.trim()) return setErro("Cole o texto da cotação");

    setEtapa("interpretando");
    startTransition(async () => {
      const result = await interpretarCotacaoAction(textoOriginal, categoria);
      if (!result.success) {
        setErro(result.error);
        setEtapa("colar");
        return;
      }
      setItens(result.data.itens);
      setAvisoItensDescartados(result.data.itensComProblema > 0 ? result.data.itensComProblema : null);
      setEtapa("revisar");
    });
  }

  function atualizarItem(index: number, campo: keyof CotacaoItemFormValues, valor: string | number) {
    setItens((prev) => prev.map((item, i) => (i === index ? { ...item, [campo]: valor } : item)));
  }

  function removerItem(index: number) {
    setItens((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSalvar() {
    setErro(null);
    if (itens.length === 0) return setErro("Adicione pelo menos um item");

    startTransition(async () => {
      const result = await salvarCotacaoAction({
        fornecedor, categoria, data_cotacao: dataCotacao, observacao, texto_original: textoOriginal, itens,
      });
      if (!result.success) return setErro(result.error);
      router.push(`/cotacoes/${result.data.id}`);
    });
  }

  if (etapa === "colar" || etapa === "interpretando") {
    return (
      <Card>
        <CardHeader><CardTitle>Dados da cotação</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label>Fornecedor</Label>
              <Input
                value={fornecedor} onChange={(e) => setFornecedor(e.target.value)}
                list="fornecedores-existentes" placeholder="Ex: Distribuidora XYZ"
              />
              <datalist id="fornecedores-existentes">
                {fornecedoresExistentes.map((f) => <option key={f} value={f} />)}
              </datalist>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Categoria</Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_SUGERIDAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Data</Label>
              <Input type="date" value={dataCotacao} onChange={(e) => setDataCotacao(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Observação geral (opcional)</Label>
            <Input value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Ex: garantia 30 dias pela loja" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Cole aqui a mensagem do fornecedor</Label>
            <Textarea
              value={textoOriginal}
              onChange={(e) => setTextoOriginal(e.target.value)}
              placeholder="Cole o texto exatamente como recebeu no WhatsApp..."
              rows={12}
              className="font-mono text-sm"
            />
          </div>

          {erro && <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{erro}</p>}

          <Button onClick={handleInterpretar} disabled={isPending} size="lg" className="w-fit">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {isPending ? "Interpretando com IA..." : "Interpretar com IA"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader><CardTitle>Prévia — revise antes de salvar</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {fornecedor} · {categoria} · {itens.length} aparelho(s) identificado(s)
          </p>
          {avisoItensDescartados && (
            <p className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning">
              {avisoItensDescartados} item(ns) foram descartados por falta de preço claro — confira o texto original se algum aparelho ficou de fora.
            </p>
          )}

          <div className="flex flex-col gap-2">
            {itens.map((item, index) => (
              <div key={index} className="grid grid-cols-2 gap-2 rounded-md border border-border p-3 sm:grid-cols-7">
                <Input
                  value={item.modelo} onChange={(e) => atualizarItem(index, "modelo", e.target.value)}
                  placeholder="Modelo" className="sm:col-span-2"
                />
                <Input value={item.armazenamento ?? ""} onChange={(e) => atualizarItem(index, "armazenamento", e.target.value)} placeholder="Armazenamento" />
                <Input value={item.cor ?? ""} onChange={(e) => atualizarItem(index, "cor", e.target.value)} placeholder="Cor" />
                <Input
                  type="number" value={item.bateria_percentual ?? ""}
                  onChange={(e) => atualizarItem(index, "bateria_percentual", Number(e.target.value))}
                  placeholder="Bateria %"
                />
                <Input
                  type="number" step="0.01" value={item.preco}
                  onChange={(e) => atualizarItem(index, "preco", Number(e.target.value))}
                  placeholder="Preço"
                />
                <div className="flex items-center gap-1">
                  <Input
                    type="number" min={1} value={item.quantidade}
                    onChange={(e) => atualizarItem(index, "quantidade", Number(e.target.value) || 1)}
                    placeholder="Qtd"
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removerItem(index)}>
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </div>
                <Input
                  value={item.observacao ?? ""} onChange={(e) => atualizarItem(index, "observacao", e.target.value)}
                  placeholder="Observação (opcional)" className="col-span-2 sm:col-span-7"
                />
              </div>
            ))}
          </div>

          {itens.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Valor total: {formatCurrency(itens.reduce((acc, i) => acc + i.preco * i.quantidade, 0))}
            </p>
          )}

          {erro && <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{erro}</p>}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setEtapa("colar")}>Voltar e editar texto</Button>
            <Button onClick={handleSalvar} disabled={isPending || itens.length === 0}>
              {isPending ? "Salvando..." : `Salvar cotação (${itens.length} itens)`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
