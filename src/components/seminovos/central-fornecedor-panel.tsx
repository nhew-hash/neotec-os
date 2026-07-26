"use client";

import { useState } from "react";
import { Sparkles, Loader2, Check, Smartphone, Sparkles as SparklesIcon, Package } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  classificarFornecedorAction, aplicarSeminovoFornecedorAction, aplicarLacradoFornecedorAction, aplicarGenericoFornecedorAction,
} from "@/services/seminovos/central-fornecedor.actions";
import { formatCurrency } from "@/utils";
import type { ItemFornecedorExtraido } from "@/services/seminovos/central-fornecedor-ia.service";

interface ItemComEstado extends ItemFornecedorExtraido {
  imei: string;
  status: "pendente" | "salvando" | "salvo" | "erro";
  erro: string | null;
}

const LABEL_DESTINO: Record<string, { label: string; icon: typeof Smartphone; cor: string }> = {
  seminovo: { label: "Seminovo", icon: Smartphone, cor: "bg-primary/10 text-primary" },
  lacrado: { label: "Lacrado", icon: SparklesIcon, cor: "bg-success/10 text-success" },
  generico: { label: "Outro produto", icon: Package, cor: "bg-warning/10 text-warning" },
};

function ItemCard({ item, index, onAtualizar }: { item: ItemComEstado; index: number; onAtualizar: (i: number, item: ItemComEstado) => void }) {
  async function handleSalvar() {
    onAtualizar(index, { ...item, status: "salvando", erro: null });

    let result;
    if (item.destino === "seminovo") {
      result = await aplicarSeminovoFornecedorAction({
        modelo: item.modelo, memoria: item.memoria, cor: item.cor, bateria: item.bateria,
        observacoes: item.observacoes, preco: item.preco, imei: item.imei,
      });
    } else if (item.destino === "lacrado") {
      result = await aplicarLacradoFornecedorAction({ modelo: item.modelo, memoria: item.memoria, cor: item.cor, preco: item.preco });
    } else {
      result = await aplicarGenericoFornecedorAction({ modelo: item.modelo, categoria: item.categoria, marca: item.marca, observacoes: item.observacoes, preco: item.preco });
    }

    if (!result.success) return onAtualizar(index, { ...item, status: "erro", erro: result.error });
    onAtualizar(index, { ...item, status: "salvo", erro: null });
  }

  const destino = LABEL_DESTINO[item.destino];

  if (item.status === "salvo") {
    return <Card><CardContent className="flex items-center gap-2 p-3 text-sm text-success"><Check className="h-4 w-4" />{item.modelo} — aplicado</CardContent></Card>;
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className={destino.cor}><destino.icon className="h-3 w-3" />{destino.label}</Badge>
            <span className="text-sm font-medium text-foreground">{item.modelo}</span>
            <span className="text-xs text-muted-foreground">{[item.memoria, item.cor, item.bateria != null && `${item.bateria}%`].filter(Boolean).join(" · ")}</span>
          </div>
          <span className="text-sm font-semibold text-foreground">{formatCurrency(item.preco)}</span>
        </div>

        {item.observacoes && <p className="text-xs text-muted-foreground">{item.observacoes}</p>}
        <p className="text-[10px] text-muted-foreground/70">"{item.linhaOriginal}"</p>

        {item.destino === "seminovo" && (
          <Input placeholder="IMEI (obrigatório)" value={item.imei} onChange={(e) => onAtualizar(index, { ...item, imei: e.target.value })} className="h-8 text-xs" />
        )}

        {item.erro && <p className="text-xs text-danger">{item.erro}</p>}

        <Button size="sm" onClick={handleSalvar} disabled={item.status === "salvando"} className="w-fit">
          {item.status === "salvando" ? "Aplicando..." : "Confirmar e aplicar"}
        </Button>
      </CardContent>
    </Card>
  );
}

export function CentralFornecedorPanel() {
  const [texto, setTexto] = useState("");
  const [itens, setItens] = useState<ItemComEstado[] | null>(null);
  const [classificando, setClassificando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleClassificar() {
    setErro(null);
    setClassificando(true);
    const result = await classificarFornecedorAction(texto);
    setClassificando(false);

    if (!result.success) return setErro(result.error);
    setItens(result.data.itens.map((item) => ({ ...item, imei: "", status: "pendente", erro: null })));
  }

  function atualizarItem(index: number, novoItem: ItemComEstado) {
    setItens((prev) => prev!.map((it, i) => (i === index ? novoItem : it)));
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
          <p className="text-sm font-medium text-foreground">Cola a lista do fornecedor — pode misturar seminovo, lacrado, iPad, Mac, Watch, acessório, qualquer coisa</p>
          <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={10} placeholder="Cola aqui a lista inteira, do jeito que chegou" />
          {erro && <p className="text-xs text-danger">{erro}</p>}
          <Button onClick={handleClassificar} disabled={classificando || !texto.trim()} className="w-fit">
            {classificando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {classificando ? "Classificando..." : "Classificar com IA"}
          </Button>
        </CardContent>
      </Card>

      {itens && (
        <>
          <p className="text-xs text-muted-foreground">{itens.length} item(ns) reconhecido(s) — confere e clica em "Confirmar e aplicar" um por um.</p>
          {itens.map((item, i) => <ItemCard key={i} item={item} index={i} onAtualizar={atualizarItem} />)}
        </>
      )}
    </div>
  );
}
