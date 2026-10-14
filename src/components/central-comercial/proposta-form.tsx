"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { salvarPropostaComoOrcamentoAction, simularPropostaAction } from "@/services/central-comercial/central-comercial.actions";
import { listarTradeInsAprovadosClienteAction } from "@/services/vendas/pdv.actions";
import type { ResultadoProposta } from "@/services/central-comercial/central-comercial.service";
import { formatCurrency } from "@/utils/format";

export interface OpcaoItem { tipo: "aparelho" | "produto"; id: string; rotulo: string; preco: number }
export interface OpcaoCliente { id: string; nome: string }

export function PropostaForm({ itens, clientes }: { itens: OpcaoItem[]; clientes: OpcaoCliente[] }) {
  const [busca, setBusca] = useState("");
  const [itemChave, setItemChave] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [desconto, setDesconto] = useState("");
  const [tradeIns, setTradeIns] = useState<{ id: string; modeloNome: string; valor: number }[]>([]);
  const [tradeInId, setTradeInId] = useState("");
  const [resultado, setResultado] = useState<ResultadoProposta | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [pendente, start] = useTransition();

  const filtrados = itens.filter((i) => i.rotulo.toLowerCase().includes(busca.toLowerCase())).slice(0, 60);
  const item = itens.find((i) => `${i.tipo}:${i.id}` === itemChave);
  const nomeCliente = clientes.find((c) => c.id === clienteId)?.nome ?? null;

  useEffect(() => {
    setTradeIns([]); setTradeInId("");
    if (!clienteId) return;
    let ativo = true;
    listarTradeInsAprovadosClienteAction(clienteId).then((r) => { if (ativo && r.success) setTradeIns(r.data); });
    return () => { ativo = false; };
  }, [clienteId]);

  function entrada() {
    return { tipo: item!.tipo, itemId: item!.id, desconto: Number(desconto.replace(",", ".")) || 0, tradeInId: tradeInId || null, clienteNome: nomeCliente };
  }
  function calcular() {
    setErro(null); setAviso(null); setResultado(null);
    if (!item) return setErro("Escolha o aparelho ou produto.");
    start(async () => { const r = await simularPropostaAction(entrada()); if (!r.success) setErro(r.error); else setResultado(r.data); });
  }
  function salvar() {
    if (!item) return;
    setErro(null); setAviso(null);
    if (!clienteId) return setErro("Escolha o cliente para salvar o orçamento.");
    start(async () => {
      const r = await salvarPropostaComoOrcamentoAction({ ...entrada(), clienteId });
      if (!r.success) setErro(r.error); else setAviso("Orçamento salvo. Para virar venda, aprove em Vendas.");
    });
  }
  async function copiar() {
    if (!resultado) return;
    try { await navigator.clipboard.writeText(resultado.texto); setAviso("Texto copiado. É só colar no WhatsApp."); } catch { setAviso("Não foi possível copiar. Selecione o texto abaixo e copie."); }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[380px_1fr]">
      <Card className="flex flex-col gap-3 p-4">
        <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Buscar item</span>
          <Input placeholder="Ex.: iPhone 15 128" value={busca} onChange={(e) => setBusca(e.target.value)} /></label>
        <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Aparelho ou produto</span>
          <select className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={itemChave} onChange={(e) => { setItemChave(e.target.value); setResultado(null); }}>
            <option value="">Escolha…</option>
            {filtrados.map((i) => <option key={`${i.tipo}:${i.id}`} value={`${i.tipo}:${i.id}`}>{`${i.rotulo} — ${formatCurrency(i.preco)}`}</option>)}
          </select></label>
        <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Cliente</span>
          <select className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
            <option value="">Sem cliente (só simular)</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select></label>
        {tradeIns.length > 0 && (
          <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Aparelho na troca (já aprovado)</span>
            <select className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={tradeInId} onChange={(e) => setTradeInId(e.target.value)}>
              <option value="">Sem troca</option>
              {tradeIns.map((t) => <option key={t.id} value={t.id}>{`${t.modeloNome} — ${formatCurrency(t.valor)}`}</option>)}
            </select></label>
        )}
        <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Desconto (R$)</span>
          <Input inputMode="decimal" placeholder="0,00" value={desconto} onChange={(e) => setDesconto(e.target.value)} /></label>
        <Button onClick={calcular} disabled={pendente || !item}>Calcular proposta</Button>
        {erro && <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{erro}</p>}
      </Card>

      <Card className="flex flex-col gap-3 p-4">
        {!resultado ? (
          <p className="text-sm text-muted-foreground">Escolha o item e calcule. O valor à vista e as parcelas saem do mesmo cálculo da loja virtual.</p>
        ) : (
          <>
            <div>
              <p className="text-sm text-muted-foreground">{resultado.item.descricao}</p>
              <p className="text-3xl font-semibold tabular-nums">{formatCurrency(resultado.proposta.aVista)}</p>
              <p className="text-sm text-muted-foreground">à vista no Pix{resultado.proposta.desconto > 0 || resultado.proposta.tradeInValor > 0 ? ` · preço de tabela ${formatCurrency(resultado.proposta.precoTabela)}` : ""}</p>
            </div>
            {resultado.avaliacaoDesconto.situacao === "requer_aprovacao" && (
              <p className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning">
                Este desconto ({resultado.avaliacaoDesconto.percentual}%) passa do seu limite de {resultado.avaliacaoDesconto.limite}%. Para vender com ele, peça a aprovação do gerente no PDV.
              </p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-muted-foreground"><th className="py-1 pr-3 font-medium">Parcelas</th><th className="py-1 pr-3 font-medium">Valor da parcela</th><th className="py-1 font-medium">Total</th></tr></thead>
                <tbody>
                  {resultado.proposta.opcoes.map((o) => (
                    <tr key={o.parcelas} className="border-t border-border tabular-nums">
                      <td className="py-1 pr-3">{o.parcelas}x {o.comJuros ? "" : <span className="text-xs text-success">sem juros</span>}</td>
                      <td className="py-1 pr-3">{formatCurrency(o.valorParcela)}</td>
                      <td className="py-1">{formatCurrency(o.valorTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {resultado.resultadoEstimado && (
              <p className="rounded-md bg-secondary px-3 py-2 text-xs text-muted-foreground">
                Visível só para gerência: custo {formatCurrency(resultado.resultadoEstimado.custo)} · resultado estimado {formatCurrency(resultado.resultadoEstimado.resultado)} (não considera a revenda de um aparelho recebido na troca).
              </p>
            )}
            <pre className="whitespace-pre-wrap rounded-md border border-border bg-background p-3 text-sm">{resultado.texto}</pre>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={copiar}>Copiar para o WhatsApp</Button>
              <Button onClick={salvar} disabled={pendente}>Salvar como orçamento</Button>
            </div>
            {aviso && <p role="status" className="text-sm text-muted-foreground">{aviso}</p>}
          </>
        )}
      </Card>
    </div>
  );
}
