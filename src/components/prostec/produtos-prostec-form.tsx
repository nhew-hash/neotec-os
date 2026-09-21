"use client";

import { useState, useTransition } from "react";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { salvarProdutosProstecAction } from "@/services/prostec/prostec.actions";

// Tipo duplicado — nunca importar (nem tipo) de prostec.service.ts num "use client".
interface ProstecProduto {
  id: string;
  nome: string;
  descricao_curta: string;
  quando_recomendar: string;
  preco: number;
  tipo_cobranca: "unico" | "mensal";
  valor_manutencao_mensal: number;
  formas_pagamento: string;
  prazo_entrega: string;
  incluso: string;
  nao_incluso: string;
  desconto_maximo_automatico_pct: number;
  parcelamento_maximo: number;
  ativo: boolean;
}

/** Isso é a ÚNICA fonte de verdade que a Iara usa pra responder preço/condição de cada produto — ela nunca inventa nada fora daqui. */
export function ProdutosProstecForm({ produtos }: { produtos: ProstecProduto[] }) {
  const [isPending, startTransition] = useTransition();
  const [salvo, setSalvo] = useState(false);

  function handleSubmit(formData: FormData) {
    setSalvo(false);
    startTransition(async () => {
      const result = await salvarProdutosProstecAction(formData);
      if (result.success) setSalvo(true);
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4 rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Catálogo de produtos — o que a Iara vende</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        A Iara nunca inventa preço, prazo ou condição — ela só fala o que está configurado aqui, pra cada produto. Desmarque
        &quot;ativo&quot; pra tirar um produto do catálogo temporariamente sem apagar os dados.
      </p>

      <div className="flex flex-col gap-4">
        {produtos.map((produto) => (
          <ProdutoCampos key={produto.id} produto={produto} />
        ))}
      </div>

      {salvo && <p className="text-xs font-medium text-success">Catálogo salvo — a Iara já usa isso na próxima mensagem.</p>}
      <Button type="submit" disabled={isPending} className="self-start">{isPending ? "Salvando..." : "Salvar catálogo"}</Button>
    </form>
  );
}

function ProdutoCampos({ produto }: { produto: ProstecProduto }) {
  const p = (campo: string) => `${produto.id}__${campo}`;
  const [tipoCobranca, setTipoCobranca] = useState<"unico" | "mensal">(produto.tipo_cobranca);
  const ehMensal = tipoCobranca === "mensal";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-black/[0.06] bg-secondary/20 p-4">
      <input type="hidden" name="produtos[]" value={produto.id} />

      <div className="flex items-center justify-between gap-3">
        <Input name={p("nome")} defaultValue={produto.nome} className="text-sm font-semibold" />
        <label className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <input type="checkbox" name={p("ativo")} defaultChecked={produto.ativo} className="h-3.5 w-3.5" />
          Ativo
        </label>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Descrição curta</label>
        <Textarea name={p("descricao_curta")} defaultValue={produto.descricao_curta} className="mt-1 text-sm" rows={2} />
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Quando a Iara deve recomendar esse produto</label>
        <Textarea name={p("quando_recomendar")} defaultValue={produto.quando_recomendar} className="mt-1 text-sm" rows={2} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">{ehMensal ? "Taxa de integração (R$, cobrança única)" : "Preço (R$)"}</label>
          <Input type="number" name={p("preco")} defaultValue={produto.preco} className="mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Cobrança</label>
          <select
            name={p("tipo_cobranca")} value={tipoCobranca}
            onChange={(e) => setTipoCobranca(e.target.value === "mensal" ? "mensal" : "unico")}
            className="mt-1 h-9 w-full rounded-lg border border-black/[0.08] bg-white px-2 text-xs"
          >
            <option value="unico">Pagamento único</option>
            <option value="mensal">Integração + mensalidade</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Parcelamento máximo</label>
          <Input type="number" name={p("parcelamento_maximo")} defaultValue={produto.parcelamento_maximo} className="mt-1" />
        </div>
      </div>

      {ehMensal && (
        <div>
          <label className="text-xs font-medium text-muted-foreground">Mensalidade de manutenção (R$/mês, a partir do 2º mês)</label>
          <Input type="number" name={p("valor_manutencao_mensal")} defaultValue={produto.valor_manutencao_mensal} className="mt-1" />
        </div>
      )}
      {!ehMensal && <input type="hidden" name={p("valor_manutencao_mensal")} value={0} />}

      <div>
        <label className="text-xs font-medium text-muted-foreground">Formas de pagamento</label>
        <Input name={p("formas_pagamento")} defaultValue={produto.formas_pagamento} className="mt-1" />
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Prazo de entrega</label>
        <Input name={p("prazo_entrega")} defaultValue={produto.prazo_entrega} className="mt-1" />
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">O que está incluso</label>
        <Textarea name={p("incluso")} defaultValue={produto.incluso} className="mt-1 text-sm" rows={2} />
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">O que NÃO está incluso</label>
        <Textarea name={p("nao_incluso")} defaultValue={produto.nao_incluso} className="mt-1 text-sm" rows={2} />
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Desconto máximo que a Iara pode oferecer sozinha (%)</label>
        <Input type="number" name={p("desconto_maximo_automatico_pct")} defaultValue={produto.desconto_maximo_automatico_pct} className="mt-1" />
        <p className="mt-1 text-[11px] text-muted-foreground">Acima disso, ela escala pro vendedor em vez de decidir sozinha.</p>
      </div>
    </div>
  );
}
