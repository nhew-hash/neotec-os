"use client";

import { useState, useTransition } from "react";
import { Sparkles, Check, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { extrairEcalcularSeminovoAction, salvarSeminovoRevisadoAction, type ItemSeminovoRevisao } from "@/services/seminovos/seminovos.actions";
import { formatCurrency } from "@/utils";

interface ItemEditavel extends ItemSeminovoRevisao {
  imei: string;
  salvo: boolean;
}

function CardItemRevisao({ item, onSalvar }: { item: ItemEditavel; onSalvar: (item: ItemEditavel) => void }) {
  const [local, setLocal] = useState(item);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function atualizar<K extends keyof ItemEditavel>(campo: K, valor: ItemEditavel[K]) {
    setLocal((prev) => ({ ...prev, [campo]: valor }));
  }

  async function handleSalvar() {
    setErro(null);
    if (!local.imei.trim()) return setErro("IMEI é obrigatório");
    if (local.precoVendaCalculado == null || local.precoPago == null) return setErro("Confira preço pago e preço de venda");

    setSalvando(true);
    const result = await salvarSeminovoRevisadoAction({
      modelo: local.modelo, memoria: local.memoria, cor: local.cor, bateria: local.bateria,
      telaOriginal: local.telaOriginal, faceIdOk: local.faceIdOk, trueToneOk: local.trueToneOk,
      pecasSubstituidas: local.pecasSubstituidas, observacoes: local.observacoes,
      precoPago: local.precoPago, precoVenda: local.precoVendaCalculado, imei: local.imei,
    });
    setSalvando(false);

    if (!result.success) return setErro(result.error);
    setLocal((prev) => ({ ...prev, salvo: true }));
    onSalvar({ ...local, salvo: true });
  }

  if (local.salvo) {
    return (
      <Card><CardContent className="flex items-center gap-2 p-4 text-sm text-success"><Check className="h-4 w-4" />{local.modelo} salvo com sucesso</CardContent></Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">{local.modelo}</span>
          {local.lucroCalculado != null && <span className="text-xs text-success">Lucro previsto: {formatCurrency(local.lucroCalculado)}</span>}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Input placeholder="Memória" value={local.memoria ?? ""} onChange={(e) => atualizar("memoria", e.target.value)} className="h-8 text-xs" />
          <Input placeholder="Cor" value={local.cor ?? ""} onChange={(e) => atualizar("cor", e.target.value)} className="h-8 text-xs" />
          <Input type="number" placeholder="Bateria %" value={local.bateria ?? ""} onChange={(e) => atualizar("bateria", Number(e.target.value) || null)} className="h-8 text-xs" />
          <Input placeholder="IMEI *" value={local.imei} onChange={(e) => atualizar("imei", e.target.value)} className="h-8 text-xs" />
        </div>

        <div className="flex flex-wrap gap-3 text-xs">
          <label className="flex items-center gap-1"><input type="checkbox" checked={local.telaOriginal === true} onChange={(e) => atualizar("telaOriginal", e.target.checked)} className="accent-primary" />Tela original</label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={local.faceIdOk === true} onChange={(e) => atualizar("faceIdOk", e.target.checked)} className="accent-primary" />Face ID ok</label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={local.trueToneOk === true} onChange={(e) => atualizar("trueToneOk", e.target.checked)} className="accent-primary" />True Tone ok</label>
        </div>

        <Input placeholder="Observações" value={local.observacoes ?? ""} onChange={(e) => atualizar("observacoes", e.target.value)} className="h-8 text-xs" />

        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-muted-foreground">Preço pago</label>
            <Input type="number" value={local.precoPago ?? ""} onChange={(e) => atualizar("precoPago", Number(e.target.value) || null)} className="h-8 text-xs" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-muted-foreground">Preço de venda</label>
            <Input type="number" value={local.precoVendaCalculado ?? ""} onChange={(e) => atualizar("precoVendaCalculado", Number(e.target.value) || null)} className="h-8 text-xs font-semibold" />
          </div>
        </div>

        {erro && <p className="text-xs text-danger">{erro}</p>}

        <Button size="sm" onClick={handleSalvar} disabled={salvando} className="w-fit">
          {salvando ? "Salvando..." : "Confirmar e salvar"}
        </Button>
      </CardContent>
    </Card>
  );
}

export function CadastroIaSeminovoPanel() {
  const [texto, setTexto] = useState("");
  const [itens, setItens] = useState<ItemEditavel[] | null>(null);
  const [interpretando, setInterpretando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function handleInterpretar() {
    setErro(null);
    setInterpretando(true);
    const result = await extrairEcalcularSeminovoAction(texto);
    setInterpretando(false);

    if (!result.success) return setErro(result.error);
    setItens(result.data.itens.map((item) => ({ ...item, imei: "", salvo: false })));
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
          <p className="text-sm font-medium text-foreground">Cola os dados do aparelho</p>
          <Textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={"Ex:\n15 PRO MAX 256G\nPreto\n92%\nTela trocada\nFace ok\nPreço 3900"}
            rows={6}
          />
          {erro && <p className="text-xs text-danger">{erro}</p>}
          <Button onClick={handleInterpretar} disabled={interpretando || !texto.trim()} className="w-fit">
            {interpretando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {interpretando ? "Interpretando..." : "Interpretar com IA"}
          </Button>
        </CardContent>
      </Card>

      {itens && itens.map((item, i) => (
        <CardItemRevisao
          key={i}
          item={item}
          onSalvar={(atualizado) => startTransition(() => setItens((prev) => prev!.map((it, idx) => (idx === i ? atualizado : it))))}
        />
      ))}
    </div>
  );
}
