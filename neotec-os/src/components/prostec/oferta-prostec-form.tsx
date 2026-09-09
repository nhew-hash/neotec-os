"use client";

import { useState, useTransition } from "react";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { salvarOfertaProstecAction } from "@/services/prostec/prostec.actions";

// Tipo duplicado — nunca importar (nem tipo) de prostec.service.ts num "use client".
interface ProstecOferta {
  produto: string;
  preco: number;
  formas_pagamento: string;
  prazo_entrega: string;
  incluso: string;
  nao_incluso: string;
  desconto_maximo_automatico_pct: number;
  parcelamento_maximo: number;
}

/** Isso é a ÚNICA fonte de verdade que a Iara usa pra responder preço/condição — ela nunca inventa nada fora daqui. */
export function OfertaProstecForm({ oferta }: { oferta: ProstecOferta }) {
  const [isPending, startTransition] = useTransition();
  const [salvo, setSalvo] = useState(false);

  function handleSubmit(formData: FormData) {
    setSalvo(false);
    startTransition(async () => {
      const result = await salvarOfertaProstecAction(formData);
      if (result.success) setSalvo(true);
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-3 rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Oferta — o que a Iara vende</h2>
      </div>
      <p className="text-xs text-muted-foreground">A Iara nunca inventa preço, prazo ou condição — ela só fala o que está configurado aqui.</p>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Produto</label>
        <Input name="produto" defaultValue={oferta.produto} className="mt-1" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Preço (R$)</label>
          <Input type="number" name="preco" defaultValue={oferta.preco} className="mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Parcelamento máximo</label>
          <Input type="number" name="parcelamento_maximo" defaultValue={oferta.parcelamento_maximo} className="mt-1" />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Formas de pagamento</label>
        <Input name="formas_pagamento" defaultValue={oferta.formas_pagamento} className="mt-1" />
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Prazo de entrega</label>
        <Input name="prazo_entrega" defaultValue={oferta.prazo_entrega} className="mt-1" />
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">O que está incluso</label>
        <Textarea name="incluso" defaultValue={oferta.incluso} className="mt-1 text-sm" rows={2} />
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">O que NÃO está incluso</label>
        <Textarea name="nao_incluso" defaultValue={oferta.nao_incluso} className="mt-1 text-sm" rows={2} />
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Desconto máximo que a Iara pode oferecer sozinha (%)</label>
        <Input type="number" name="desconto_maximo_automatico_pct" defaultValue={oferta.desconto_maximo_automatico_pct} className="mt-1" />
        <p className="mt-1 text-[11px] text-muted-foreground">Acima disso, ela escala pro vendedor em vez de decidir sozinha.</p>
      </div>

      {salvo && <p className="text-xs font-medium text-success">Oferta salva — a Iara já usa isso na próxima mensagem.</p>}
      <Button type="submit" disabled={isPending} className="self-start">{isPending ? "Salvando..." : "Salvar oferta"}</Button>
    </form>
  );
}
