"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, Minus, Search, UserPlus, Smartphone, Package, X, Gift, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { finalizarVendaPDVAction, buscarSaldoCashbackAction } from "@/services/vendas/pdv.actions";
import { criarClienteAction } from "@/services/clientes/clientes.actions";
import { formatCurrency, getInitials } from "@/utils";
import type { PdvItemValues, PdvVendaValues } from "@/services/vendas/pdv.schema";
import type { Cliente, Produto, Indicador } from "@/types";
import type { AparelhoComProduto } from "@/services/estoque/estoque.service";

const FORMAS_PAGAMENTO = [
  { value: "pix", label: "Pix" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao_credito", label: "Crédito" },
  { value: "cartao_debito", label: "Débito" },
  { value: "boleto", label: "Boleto" },
  { value: "misto", label: "Misto" },
] as const;

interface PdvCartProps {
  clientes: Cliente[];
  produtos: Produto[];
  aparelhos: AparelhoComProduto[];
  indicadores: Indicador[];
}

export function PdvCart({ clientes: clientesIniciais, produtos, aparelhos, indicadores }: PdvCartProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const [clientes, setClientes] = useState(clientesIniciais);
  const [itens, setItens] = useState<PdvItemValues[]>([]);
  const [clienteId, setClienteId] = useState<string>("");
  const [formaPagamento, setFormaPagamento] = useState<string>("pix");
  const [desconto, setDesconto] = useState<number>(0);
  const [busca, setBusca] = useState("");

  const [mostrarNovoCliente, setMostrarNovoCliente] = useState(false);
  const [novoClienteNome, setNovoClienteNome] = useState("");
  const [novoClienteWhatsapp, setNovoClienteWhatsapp] = useState("");
  const [novoClienteCpf, setNovoClienteCpf] = useState("");
  const [salvandoCliente, setSalvandoCliente] = useState(false);
  const [erroCliente, setErroCliente] = useState<string | null>(null);

  const [garantiaDias, setGarantiaDias] = useState<number>(90);
  const [indicadorId, setIndicadorId] = useState<string>("");
  const [cashbackSaldo, setCashbackSaldo] = useState<number>(0);
  const [cashbackUtilizado, setCashbackUtilizado] = useState<number>(0);
  const [cashbackConcedido, setCashbackConcedido] = useState<number>(0);

  const temAparelho = itens.some((i) => i.tipo === "aparelho");

  // Busca o saldo de cashback toda vez que troca de cliente — zera se
  // desmarcar cliente (venda avulsa não tem cashback pra usar).
  useEffect(() => {
    if (!clienteId) {
      setCashbackSaldo(0);
      setCashbackUtilizado(0);
      return;
    }
    buscarSaldoCashbackAction(clienteId).then((result) => {
      if (result.success) setCashbackSaldo(result.data.saldo);
    });
  }, [clienteId]);

  const termoBusca = busca.trim().toLowerCase();

  const aparelhosDisponiveis = aparelhos.filter(
    (a) =>
      a.status === "disponivel" &&
      !itens.some((i) => i.tipo === "aparelho" && i.id === a.id) &&
      (termoBusca === "" || `${a.produto?.nome ?? ""} ${a.imei} ${a.cor ?? ""}`.toLowerCase().includes(termoBusca))
  );

  const produtosFiltrados = produtos.filter(
    (p) => termoBusca === "" || p.nome.toLowerCase().includes(termoBusca)
  );

  const subtotal = useMemo(() => itens.reduce((acc, i) => acc + i.valor * i.quantidade, 0), [itens]);
  const total = Math.max(0, subtotal - desconto - cashbackUtilizado);

  function adicionarAparelho(aparelho: AparelhoComProduto) {
    setItens((prev) => [
      ...prev,
      {
        tipo: "aparelho",
        id: aparelho.id,
        nome: `${aparelho.produto?.nome ?? "Aparelho"} — ${aparelho.imei}`,
        quantidade: 1,
        valor: aparelho.preco_venda ?? 0,
      },
    ]);
  }

  function adicionarProduto(produto: Produto) {
    const existente = itens.find((i) => i.tipo === "produto" && i.id === produto.id);
    if (existente) {
      setItens((prev) => prev.map((i) => (i === existente ? { ...i, quantidade: i.quantidade + 1 } : i)));
      return;
    }
    setItens((prev) => [
      ...prev,
      { tipo: "produto", id: produto.id, nome: produto.nome, quantidade: 1, valor: produto.preco_venda ?? 0 },
    ]);
  }

  function removerItem(index: number) {
    setItens((prev) => prev.filter((_, i) => i !== index));
  }

  function atualizarItem(index: number, campo: "quantidade" | "valor", valor: number) {
    setItens((prev) => prev.map((item, i) => (i === index ? { ...item, [campo]: Math.max(campo === "quantidade" ? 1 : 0, valor) } : item)));
  }

  async function handleCriarCliente() {
    setErroCliente(null);
    if (novoClienteNome.trim().length < 2) return setErroCliente("Informe o nome");
    if (!/^\d{10,11}$/.test(novoClienteWhatsapp.replace(/\D/g, ""))) return setErroCliente("WhatsApp inválido — só números, com DDD");

    setSalvandoCliente(true);
    const formData = new FormData();
    formData.set("nome", novoClienteNome.trim());
    formData.set("whatsapp", novoClienteWhatsapp.replace(/\D/g, ""));
    if (novoClienteCpf.trim()) formData.set("cpf", novoClienteCpf.trim());
    const result = await criarClienteAction(formData);
    setSalvandoCliente(false);

    if (!result.success) return setErroCliente(result.error);
    setClientes((prev) => [...prev, result.data]);
    setClienteId(result.data.id);
    setMostrarNovoCliente(false);
    setNovoClienteNome("");
    setNovoClienteWhatsapp("");
    setNovoClienteCpf("");
  }

  function handleFinalizar() {
    setErro(null);
    if (itens.length === 0) return setErro("Adicione pelo menos um item à venda");

    startTransition(async () => {
      const payload: PdvVendaValues = {
        cliente_id: clienteId || undefined,
        forma_pagamento: formaPagamento as PdvVendaValues["forma_pagamento"],
        desconto,
        garantia_dias: garantiaDias > 0 ? garantiaDias : undefined,
        indicador_id: indicadorId || undefined,
        cashback_utilizado: cashbackUtilizado,
        cashback_concedido: cashbackConcedido,
        itens,
      };
      const result = await finalizarVendaPDVAction(payload);

      if (!result.success) return setErro(result.error);
      router.push(`/vendas/${result.data.vendaId}`);
      router.refresh();
    });
  }

  const clienteSelecionado = clientes.find((c) => c.id === clienteId);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_380px]">
      <div className="flex flex-col gap-4">
        {/* Cliente */}
        <Card>
          <CardContent className="flex flex-col gap-2 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Cliente</p>
            {mostrarNovoCliente ? (
              <div className="flex flex-col gap-2 rounded-md border border-border p-3">
                <div className="flex gap-2">
                  <Input placeholder="Nome completo" value={novoClienteNome} onChange={(e) => setNovoClienteNome(e.target.value)} />
                  <Input placeholder="WhatsApp (DDD + número)" value={novoClienteWhatsapp} onChange={(e) => setNovoClienteWhatsapp(e.target.value)} />
                </div>
                <Input
                  placeholder={temAparelho ? "CPF (recomendado ao vender aparelho — nota/garantia)" : "CPF (opcional)"}
                  value={novoClienteCpf}
                  onChange={(e) => setNovoClienteCpf(e.target.value)}
                />
                {erroCliente && <p className="text-xs text-danger">{erroCliente}</p>}
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={handleCriarCliente} disabled={salvandoCliente}>
                    {salvandoCliente ? "Salvando..." : "Adicionar cliente"}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setMostrarNovoCliente(false)}>
                    <X className="h-3.5 w-3.5" />Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Select onValueChange={setClienteId} value={clienteId}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Venda avulsa (sem cliente)" /></SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" onClick={() => setMostrarNovoCliente(true)} title="Cliente novo">
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
            )}
            {clienteSelecionado && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 rounded-md bg-secondary px-2.5 py-1.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                    {getInitials(clienteSelecionado.nome)}
                  </div>
                  <span className="text-xs text-foreground">{clienteSelecionado.nome}</span>
                </div>
                {temAparelho && !clienteSelecionado.cpf && (
                  <p className="text-[11px] text-warning">
                    Cliente sem CPF cadastrado — recomendado informar ao vender aparelho (nota/garantia).
                  </p>
                )}
                {cashbackSaldo > 0 && (
                  <p className="flex items-center gap-1 text-[11px] text-success">
                    <Gift className="h-3 w-3" />Saldo de cashback disponível: {formatCurrency(cashbackSaldo)}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Busca de itens */}
        <Card>
          <CardContent className="flex flex-col gap-3 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar aparelho ou produto (nome, IMEI, cor...)"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9"
              />
            </div>

            {aparelhosDisponiveis.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <Smartphone className="h-3 w-3" />Aparelhos disponíveis
                </p>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {aparelhosDisponiveis.slice(0, 12).map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => adicionarAparelho(a)}
                      className="flex items-center justify-between gap-2 rounded-md border border-border p-2.5 text-left transition-colors hover:border-primary hover:bg-primary/5"
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="truncate text-xs font-medium text-foreground">{a.produto?.nome}</span>
                        <span className="neotec-id-tag mt-0.5 w-fit">{a.imei}</span>
                      </div>
                      <span className="neotec-dado shrink-0 text-xs font-semibold text-foreground">
                        {a.preco_venda ? formatCurrency(a.preco_venda) : "—"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {produtosFiltrados.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <Package className="h-3 w-3" />Produtos e acessórios
                </p>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {produtosFiltrados.slice(0, 12).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => adicionarProduto(p)}
                      className="flex items-center justify-between gap-2 rounded-md border border-border p-2.5 text-left transition-colors hover:border-primary hover:bg-primary/5"
                    >
                      <span className="truncate text-xs font-medium text-foreground">{p.nome}</span>
                      <span className="neotec-dado shrink-0 text-xs font-semibold text-foreground">
                        {p.preco_venda ? formatCurrency(p.preco_venda) : "—"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {aparelhosDisponiveis.length === 0 && produtosFiltrados.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">Nada encontrado pra "{busca}".</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Carrinho + finalização */}
      <Card className="h-fit lg:sticky lg:top-4">
        <CardContent className="flex flex-col gap-3 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Carrinho</p>

          {itens.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Clique num aparelho ou produto pra adicionar.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {itens.map((item, index) => (
                <div key={`${item.tipo}-${item.id}-${index}`} className="flex items-center gap-2 rounded-md border border-border p-2">
                  <span className="flex-1 truncate text-xs text-foreground">{item.nome}</span>
                  {item.tipo === "produto" && (
                    <div className="flex items-center gap-1">
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => atualizarItem(index, "quantidade", item.quantidade - 1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="neotec-dado w-5 text-center text-xs">{item.quantidade}</span>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => atualizarItem(index, "quantidade", item.quantidade + 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <Input
                    type="number" step="0.01" value={item.valor}
                    onChange={(e) => atualizarItem(index, "valor", Number(e.target.value) || 0)}
                    className="h-7 w-20 text-xs"
                  />
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removerItem(index)}>
                    <Trash2 className="h-3.5 w-3.5 text-danger" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Forma de pagamento</label>
            <div className="grid grid-cols-3 gap-1.5">
              {FORMAS_PAGAMENTO.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFormaPagamento(f.value)}
                  className={cn(
                    "rounded-md border px-2 py-1.5 text-xs font-medium transition-colors",
                    formaPagamento === f.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:border-foreground/20"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Desconto (opcional)</label>
            <Input type="number" step="0.01" value={desconto} onChange={(e) => setDesconto(Number(e.target.value) || 0)} />
          </div>

          {temAparelho && (
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <ShieldCheck className="h-3 w-3" />Garantia (dias)
              </label>
              <Input type="number" min={0} value={garantiaDias} onChange={(e) => setGarantiaDias(Number(e.target.value) || 0)} />
            </div>
          )}

          {indicadores.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Indicação (opcional)</label>
              <Select onValueChange={setIndicadorId} value={indicadorId}>
                <SelectTrigger><SelectValue placeholder="Ninguém indicou" /></SelectTrigger>
                <SelectContent>
                  {indicadores.map((ind) => <SelectItem key={ind.id} value={ind.id}>{ind.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {clienteId && (
            <div className="flex flex-col gap-2 rounded-md border border-border p-3">
              <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <Gift className="h-3 w-3" />Cashback
              </p>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-muted-foreground">Usar do saldo (máx. {formatCurrency(cashbackSaldo)})</label>
                <Input
                  type="number" step="0.01" min={0} max={cashbackSaldo} value={cashbackUtilizado}
                  onChange={(e) => setCashbackUtilizado(Math.min(cashbackSaldo, Math.max(0, Number(e.target.value) || 0)))}
                  disabled={cashbackSaldo === 0}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-muted-foreground">Conceder nessa compra</label>
                <Input type="number" step="0.01" min={0} value={cashbackConcedido} onChange={(e) => setCashbackConcedido(Number(e.target.value) || 0)} />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1 border-t border-border pt-3 text-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="neotec-dado">{formatCurrency(subtotal)}</span>
            </div>
            {desconto > 0 && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Desconto</span>
                <span className="neotec-dado text-danger">-{formatCurrency(desconto)}</span>
              </div>
            )}
            {cashbackUtilizado > 0 && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Cashback usado</span>
                <span className="neotec-dado text-danger">-{formatCurrency(cashbackUtilizado)}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-1">
              <span className="font-medium text-foreground">Total</span>
              <span className="neotec-dado font-display text-xl font-semibold text-foreground">{formatCurrency(total)}</span>
            </div>
          </div>

          {erro && <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{erro}</p>}

          <Button onClick={handleFinalizar} disabled={isPending || itens.length === 0} size="lg">
            {isPending ? "Finalizando..." : "Finalizar venda"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
