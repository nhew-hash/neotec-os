"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { aparelhoSchema, type AparelhoFormValues } from "@/services/estoque/estoque.schema";
import { criarAparelhoAction, criarProdutoRapidoAction } from "@/services/estoque/estoque.actions";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { Produto, Investidor } from "@/types";

const CONDICOES = [
  { value: "novo", label: "Novo" },
  { value: "seminovo", label: "Seminovo" },
  { value: "usado", label: "Usado" },
] as const;

const CATEGORIAS_PRODUTO_NOVO = [
  { value: "iphone", label: "iPhone" },
  { value: "android", label: "Android" },
  { value: "apple_watch", label: "Apple Watch" },
  { value: "ipad", label: "iPad" },
  { value: "mac", label: "Mac" },
  { value: "acessorio", label: "Acessório" },
  { value: "peca", label: "Peça" },
] as const;

const ORIGENS_ENTRADA = [
  { value: "fornecedor", label: "Fornecedor" },
  { value: "cliente", label: "Cliente" },
  { value: "troca", label: "Troca" },
  { value: "compra", label: "Compra" },
  { value: "consignacao", label: "Consignação" },
  { value: "investidor", label: "Investidor" },
  { value: "marketplace", label: "Marketplace" },
  { value: "leilao", label: "Leilão" },
] as const;

export function AparelhoForm({ produtos: produtosIniciais, investidores }: { produtos: Produto[]; investidores: Investidor[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [produtos, setProdutos] = useState(produtosIniciais);
  const [criandoProduto, setCriandoProduto] = useState(false);
  const [nomeNovoProduto, setNomeNovoProduto] = useState("");
  const [categoriaNovoProduto, setCategoriaNovoProduto] = useState<Produto["categoria"]>("iphone");
  const [salvandoProduto, setSalvandoProduto] = useState(false);
  const [erroProduto, setErroProduto] = useState<string | null>(null);

  const form = useForm<AparelhoFormValues>({
    resolver: zodResolver(aparelhoSchema),
    defaultValues: {
      produto_id: "", imei: "", numero_serie: "", cor: "", memoria: "",
      condicao: "seminovo", origem_entrada: "fornecedor", fornecedor: "", pecas_substituidas: [],
    },
  });

  function onSubmit(values: AparelhoFormValues) {
    setErro(null);
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (key === "pecas_substituidas") {
        (value as string[]).forEach((peca) => formData.append("pecas_substituidas", peca));
        return;
      }
      formData.set(key, String(value ?? ""));
    });

    startTransition(async () => {
      const result = await criarAparelhoAction(formData);
      if (!result.success) return setErro(result.error);
      router.push("/estoque");
      router.refresh();
    });
  }

  const condicaoAtual = form.watch("condicao");
  const ehUsado = condicaoAtual === "seminovo" || condicaoAtual === "usado";

  async function handleCriarProduto() {
    setErroProduto(null);
    if (!nomeNovoProduto.trim()) return setErroProduto("Dá um nome pro produto");

    setSalvandoProduto(true);
    const result = await criarProdutoRapidoAction({ nome: nomeNovoProduto.trim(), categoria: categoriaNovoProduto });
    setSalvandoProduto(false);

    if (!result.success) return setErroProduto(result.error);

    const novoProduto: Produto = {
      id: result.data.id, nome: result.data.nome, categoria: categoriaNovoProduto,
      loja_id: "", marca: null, modelo: null, descricao: null, preco_venda: null, custo: null,
      estoque_minimo: 0, status: "ativo", visivel_loja: false, slug: null, descricao_loja: null,
      preco_antigo: null, preco_liquido_desejado: null, selos_manuais: [], fotos: [], mostrar_trade_in: false, retirar_em: null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };

    setProdutos((prev) => [...prev, novoProduto]);
    form.setValue("produto_id", novoProduto.id);
    setCriandoProduto(false);
    setNomeNovoProduto("");
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <FormField control={form.control} name="produto_id" render={({ field }) => (
          <FormItem>
            <FormLabel>Modelo do catálogo</FormLabel>
            <div className="flex gap-2">
              <div className="flex-1">
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Selecione um produto" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {produtos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" variant="outline" onClick={() => setCriandoProduto((v) => !v)}>
                <Plus className="h-4 w-4" />Novo
              </Button>
            </div>

            {criandoProduto && (
              <div className="flex flex-col gap-2 rounded-lg border border-border bg-secondary/40 p-3">
                <div className="flex gap-2">
                  <Input placeholder="Nome do produto (ex: iPhone 16 Pro)" value={nomeNovoProduto} onChange={(e) => setNomeNovoProduto(e.target.value)} className="flex-1" />
                  <Select value={categoriaNovoProduto} onValueChange={(v) => setCategoriaNovoProduto(v as Produto["categoria"])}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS_PRODUTO_NOVO.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {erroProduto && <p className="text-xs text-danger">{erroProduto}</p>}
                <Button type="button" size="sm" onClick={handleCriarProduto} disabled={salvandoProduto} className="w-fit">
                  {salvandoProduto ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  {salvandoProduto ? "Criando..." : "Criar e usar esse produto"}
                </Button>
              </div>
            )}

            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="imei" render={({ field }) => (
          <FormItem>
            <FormLabel>IMEI</FormLabel>
            <FormControl><Input className="font-mono" placeholder="15 dígitos" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid grid-cols-2 gap-5">
          <FormField control={form.control} name="cor" render={({ field }) => (
            <FormItem>
              <FormLabel>Cor (opcional)</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="memoria" render={({ field }) => (
            <FormItem>
              <FormLabel>Memória (opcional)</FormLabel>
              <FormControl><Input placeholder="256GB" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid grid-cols-2 gap-5">
          <FormField control={form.control} name="condicao" render={({ field }) => (
            <FormItem>
              <FormLabel>Condição</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  {CONDICOES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="bateria" render={({ field }) => (
            <FormItem>
              <FormLabel>Bateria % (opcional)</FormLabel>
              <FormControl><Input type="number" min={0} max={100} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        {ehUsado && (
          <>
            <FormField control={form.control} name="pecas_substituidas" render={({ field }) => (
              <FormItem>
                <FormLabel>Peças substituídas</FormLabel>
                <div className="flex gap-4">
                  {[
                    { valor: "tela", label: "Tela" },
                    { valor: "bateria", label: "Bateria" },
                    { valor: "carcaca", label: "Carcaça" },
                    { valor: "camera", label: "Câmera" },
                    { valor: "sem_face_id", label: "Sem Face ID" },
                  ].map((peca) => (
                    <label key={peca.valor} className="flex items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={field.value?.includes(peca.valor as never) ?? false}
                        onChange={(e) => {
                          const atual = field.value ?? [];
                          field.onChange(e.target.checked ? [...atual, peca.valor] : atual.filter((p) => p !== peca.valor));
                        }}
                        className="h-4 w-4 accent-primary"
                      />
                      {peca.label}
                    </label>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="observacoes" render={({ field }) => (
              <FormItem>
                <FormLabel>Observações (opcional)</FormLabel>
                <FormControl><Input placeholder="Ex: pequeno risco lateral, marcas de uso, excelente estado" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </>
        )}

        <div className="grid grid-cols-2 gap-5">
          <FormField control={form.control} name="custo" render={({ field }) => (
            <FormItem>
              <FormLabel>Custo</FormLabel>
              <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="preco_venda" render={({ field }) => (
            <FormItem>
              <FormLabel>Preço de venda</FormLabel>
              <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid grid-cols-2 gap-5">
          <FormField control={form.control} name="preco_minimo" render={({ field }) => (
            <FormItem>
              <FormLabel>Preço mínimo (opcional)</FormLabel>
              <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="preco_sugerido" render={({ field }) => (
            <FormItem>
              <FormLabel>Preço sugerido (opcional)</FormLabel>
              <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid grid-cols-2 gap-5">
          <FormField control={form.control} name="origem_entrada" render={({ field }) => (
            <FormItem>
              <FormLabel>Origem de entrada</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  {ORIGENS_ENTRADA.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="fornecedor" render={({ field }) => (
            <FormItem>
              <FormLabel>Fornecedor (opcional)</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="investidor_id" render={({ field }) => (
          <FormItem>
            <FormLabel>Investidor vinculado (opcional)</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Nenhum — capital da própria loja" /></SelectTrigger></FormControl>
              <SelectContent>
                {investidores.map((i) => <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        {erro && <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{erro}</p>}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.push("/estoque")}>Cancelar</Button>
          <Button type="submit" disabled={isPending}>{isPending ? "Salvando..." : "Cadastrar aparelho"}</Button>
        </div>
      </form>
    </Form>
  );
}
