"use client";

import { useState } from "react";
import { Sparkles, Loader2, Check, Smartphone, Sparkles as SparklesIcon, Package, Zap, Trash2, AlertTriangle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  classificarFornecedorAction, aplicarSeminovoFornecedorAction, aplicarLacradoFornecedorAction, aplicarGenericoFornecedorAction,
  preverSubstituicaoAction, substituirListaFornecedorAction,
  type ItemFornecedorClassificado,
} from "@/services/seminovos/central-fornecedor.actions";
import { formatCurrency } from "@/utils";

interface ItemComEstado extends ItemFornecedorClassificado {
  imei: string;
  precoVendaEditavel: number;
  status: "pendente" | "salvando" | "salvo" | "erro";
  erro: string | null;
  aparelhoId?: string; // só preenchido pra "seminovo" — usado pro botão de publicar direto aqui
  publicado?: boolean;
}

const LABEL_DESTINO: Record<string, { label: string; icon: typeof Smartphone; cor: string }> = {
  seminovo: { label: "Seminovo", icon: Smartphone, cor: "bg-primary/10 text-primary" },
  lacrado: { label: "Lacrado", icon: SparklesIcon, cor: "bg-success/10 text-success" },
  generico: { label: "Outro produto", icon: Package, cor: "bg-warning/10 text-warning" },
};

async function aplicarItem(item: ItemComEstado): Promise<{ success: boolean; error?: string; aparelhoId?: string }> {
  if (item.destino === "seminovo") {
    const result = await aplicarSeminovoFornecedorAction({
      modelo: item.modelo, memoria: item.memoria, cor: item.cor, bateria: item.bateria,
      observacoes: item.observacoes, precoPago: item.preco, precoVenda: item.precoVendaEditavel, imei: item.imei,
    });
    return result.success ? { success: true, aparelhoId: result.data.aparelhoId } : result;
  }
  if (item.destino === "lacrado") {
    return aplicarLacradoFornecedorAction({ modelo: item.modelo, memoria: item.memoria, cor: item.cor, preco: item.preco });
  }
  return aplicarGenericoFornecedorAction({ modelo: item.modelo, categoria: item.categoria, marca: item.marca, observacoes: item.observacoes, preco: item.preco });
}

function ItemCard({ item, index, onAtualizar }: { item: ItemComEstado; index: number; onAtualizar: (i: number, item: ItemComEstado) => void }) {
  async function handleSalvar() {
    onAtualizar(index, { ...item, status: "salvando", erro: null });
    const result = await aplicarItem(item);
    if (!result.success) return onAtualizar(index, { ...item, status: "erro", erro: result.error ?? "Erro" });
    onAtualizar(index, { ...item, status: "salvo", erro: null, aparelhoId: result.aparelhoId });
  }

  async function handlePublicar() {
    if (!item.aparelhoId) return;
    onAtualizar(index, { ...item, publicado: true }); // otimista — a maioria funciona, e a tela não trava esperando
    const { alternarPublicacaoLojaAparelhoAction } = await import("@/services/estoque/estoque.actions");
    const result = await alternarPublicacaoLojaAparelhoAction(item.aparelhoId, true);
    if (!result.success) onAtualizar(index, { ...item, publicado: false, erro: result.error });
  }

  const destino = LABEL_DESTINO[item.destino];

  if (item.status === "salvo") {
    return (
      <Card>
        <CardContent className="flex items-center justify-between gap-2 p-3">
          <span className="flex items-center gap-2 text-sm text-success"><Check className="h-4 w-4" />{item.modelo} — aplicado</span>
          {item.destino === "seminovo" && item.aparelhoId && (
            item.publicado ? (
              <span className="flex items-center gap-1 text-xs font-medium text-primary"><Check className="h-3.5 w-3.5" />Publicado na loja</span>
            ) : (
              <Button size="sm" variant="outline" onClick={handlePublicar}>Publicar na loja</Button>
            )
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge className={destino.cor}><destino.icon className="h-3 w-3" />{destino.label}</Badge>
            <span className="text-sm font-medium text-foreground">{item.modelo}</span>
            <span className="text-xs text-muted-foreground">{[item.memoria, item.cor, item.bateria != null && `${item.bateria}%`].filter(Boolean).join(" · ")}</span>
          </div>

          {item.destino === "seminovo" ? (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Pago: {formatCurrency(item.preco)}</span>
              <span className="text-foreground">→</span>
              <Input
                type="number" value={item.precoVendaEditavel}
                onChange={(e) => onAtualizar(index, { ...item, precoVendaEditavel: Number(e.target.value) || 0 })}
                className="h-7 w-24 text-xs font-semibold"
              />
              {item.lucroSugerido != null && <span className="text-success">lucro {formatCurrency(item.precoVendaEditavel - item.preco)}</span>}
            </div>
          ) : (
            <span className="text-sm font-semibold text-foreground">{formatCurrency(item.preco)}</span>
          )}
        </div>

        {item.observacoes && <p className="text-xs text-muted-foreground">{item.observacoes}</p>}
        <p className="text-[10px] text-muted-foreground/70">"{item.linhaOriginal}"</p>

        {item.destino === "seminovo" && (
          <Input placeholder="IMEI (opcional — dá pra completar depois no Estoque)" value={item.imei} onChange={(e) => onAtualizar(index, { ...item, imei: e.target.value })} className="h-8 text-xs" />
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
  const [aplicandoTudo, setAplicandoTudo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [previaSubstituicao, setPreviaSubstituicao] = useState<{ seminovosParaApagar: number; lacradosParaZerar: number } | null>(null);
  const [substituindo, setSubstituindo] = useState(false);
  const [resultadoSubstituicao, setResultadoSubstituicao] = useState<{ seminovosApagados: number; lacradosZerados: number } | null>(null);
  const [textoConfirmacao, setTextoConfirmacao] = useState("");

  async function handleClassificar() {
    setErro(null);
    setClassificando(true);
    const result = await classificarFornecedorAction(texto);
    setClassificando(false);

    if (!result.success) return setErro(result.error);
    setItens(result.data.itens.map((item) => ({
      ...item, imei: "", precoVendaEditavel: item.precoVendaSugerido ?? item.preco, status: "pendente", erro: null,
    })));
  }

  function atualizarItem(index: number, novoItem: ItemComEstado) {
    setItens((prev) => prev!.map((it, i) => (i === index ? novoItem : it)));
  }

  /** Aplica todos os itens pendentes de uma vez — em paralelo, cada um atualiza seu próprio status quando termina. */
  async function handleAplicarTudo() {
    if (!itens) return;
    setAplicandoTudo(true);

    const pendentes = itens.map((it, i) => ({ it, i })).filter(({ it }) => it.status === "pendente");
    setItens((prev) => prev!.map((it) => (it.status === "pendente" ? { ...it, status: "salvando" } : it)));

    await Promise.all(
      pendentes.map(async ({ it, i }) => {
        const result = await aplicarItem(it);
        setItens((prev) => prev!.map((item, idx) =>
          idx === i ? { ...item, status: result.success ? "salvo" : "erro", erro: result.success ? null : (result.error ?? "Erro"), aparelhoId: result.aparelhoId } : item
        ));
      })
    );

    setAplicandoTudo(false);
  }

  /** Passo 1: calcula quantos registros seriam apagados — nunca apaga nada ainda, só mostra o número pra confirmar. */
  async function handlePedirConfirmacaoSubstituicao() {
    if (!itens) return;
    setErro(null);
    const itensParaChave = itens.map((i) => ({ destino: i.destino, modelo: i.modelo, memoria: i.memoria, cor: i.cor }));
    const result = await preverSubstituicaoAction(itensParaChave);
    if (!result.success) return setErro(result.error);
    setPreviaSubstituicao(result.data);
  }

  /** Passo 2: só roda depois da equipe confirmar o número da prévia — aplica tudo, depois apaga/zera o que não veio na lista nova. */
  async function handleConfirmarSubstituicao() {
    if (!itens) return;
    setSubstituindo(true);
    setPreviaSubstituicao(null);
    setTextoConfirmacao("");

    // Aplica todos os itens pendentes primeiro (mesma lógica do "Aplicar tudo").
    await Promise.all(itens.filter((it) => it.status === "pendente").map((it) => aplicarItem(it)));
    setItens((prev) => prev!.map((it) => (it.status === "pendente" ? { ...it, status: "salvo" } : it)));

    const itensParaChave = itens.map((i) => ({ destino: i.destino, modelo: i.modelo, memoria: i.memoria, cor: i.cor }));
    const result = await substituirListaFornecedorAction(itensParaChave);
    setSubstituindo(false);

    if (!result.success) return setErro(result.error);
    setResultadoSubstituicao(result.data);
  }

  const pendentesCount = itens?.filter((i) => i.status === "pendente").length ?? 0;

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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">{itens.length} item(ns) reconhecido(s) — confere cada um (principalmente o preço de venda dos seminovos) antes de aplicar.</p>
            <div className="flex items-center gap-2">
              {pendentesCount > 0 && (
                <Button size="sm" variant="outline" onClick={handleAplicarTudo} disabled={aplicandoTudo}>
                  <Zap className="h-3.5 w-3.5" />{aplicandoTudo ? "Aplicando tudo..." : `Aplicar tudo (${pendentesCount})`}
                </Button>
              )}
              <Button size="sm" variant="outline" className="border-danger/40 text-danger hover:bg-danger/5" onClick={handlePedirConfirmacaoSubstituicao} disabled={substituindo}>
                <Trash2 className="h-3.5 w-3.5" />Essa lista substitui a do fornecedor
              </Button>
            </div>
          </div>

          {previaSubstituicao && (
            <Card className="border-danger/40">
              <CardContent className="flex flex-col gap-3 p-4">
                <p className="flex items-center gap-1.5 text-sm font-medium text-danger"><AlertTriangle className="h-4 w-4" />Confirma a substituição?</p>
                <p className="text-xs text-foreground">
                  Isso vai <strong>apagar {previaSubstituicao.seminovosParaApagar} seminovo(s)</strong> e <strong>zerar {previaSubstituicao.lacradosParaZerar} variante(s) de lacrado</strong> que não estão nessa lista nova — presume que o fornecedor não tem mais esses. Reservado/vendido nunca é apagado.
                </p>
                <p className="text-xs text-muted-foreground">Digite <strong>APAGAR</strong> pra confirmar:</p>
                <Input value={textoConfirmacao} onChange={(e) => setTextoConfirmacao(e.target.value)} placeholder="APAGAR" className="w-40" />
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" onClick={handleConfirmarSubstituicao} disabled={substituindo || textoConfirmacao !== "APAGAR"}>{substituindo ? "Substituindo..." : "Confirmar e apagar"}</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setPreviaSubstituicao(null); setTextoConfirmacao(""); }}>Cancelar</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {resultadoSubstituicao && (
            <p className="flex items-center gap-1.5 text-sm text-success">
              <Check className="h-4 w-4" />Lista substituída — {resultadoSubstituicao.seminovosApagados} seminovo(s) apagado(s), {resultadoSubstituicao.lacradosZerados} lacrado(s) zerado(s).
            </p>
          )}

          {itens.map((item, i) => <ItemCard key={i} item={item} index={i} onAtualizar={atualizarItem} />)}
        </>
      )}
    </div>
  );
}
