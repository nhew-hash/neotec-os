"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { Loader2, Search, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buscarClientesAction, cadastrarClienteRapidoAction, type ResultadoCadastroRapido } from "@/services/central-comercial/central-comercial.actions";
import type { ClienteResultado } from "@/services/central-comercial/clientes-busca.service";
import { formatarTelefone, interpretarBuscaCliente } from "@/lib/telefone";

/**
 * Busca de cliente por nome e/ou telefone. A pesquisa roda NO SERVIDOR (debounce de 300 ms, 8 por página);
 * nunca carregamos a lista de clientes no navegador. Telefone vale com ou sem formatação.
 */
export function ClienteBusca({ cliente, onSelecionar, desabilitado }: { cliente: ClienteResultado | null; onSelecionar: (c: ClienteResultado | null) => void; desabilitado?: boolean }) {
  const idLista = useId();
  const [q, setQ] = useState("");
  const [itens, setItens] = useState<ClienteResultado[]>([]);
  const [temMais, setTemMais] = useState(false);
  const [pagina, setPagina] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);
  const [cadastrando, setCadastrando] = useState(false);
  const requisicao = useRef(0);

  useEffect(() => {
    if (cliente || !aberto) return;
    const minha = ++requisicao.current;
    const t = setTimeout(async () => {
      setCarregando(true); setErro(null);
      const r = await buscarClientesAction(q, 0);
      if (minha !== requisicao.current) return; // resposta velha: ignora
      setCarregando(false);
      if (!r.success) { setErro(r.error); setItens([]); setTemMais(false); return; }
      setItens(r.data.itens); setTemMais(r.data.temMais); setPagina(0);
    }, q.trim() ? 300 : 0);
    return () => clearTimeout(t);
  }, [q, cliente, aberto]);

  async function maisResultados() {
    const minha = ++requisicao.current;
    setCarregando(true);
    const r = await buscarClientesAction(q, pagina + 1);
    if (minha !== requisicao.current) return;
    setCarregando(false);
    if (!r.success) return setErro(r.error);
    setItens((atual) => [...atual, ...r.data.itens]); setTemMais(r.data.temMais); setPagina((p) => p + 1);
  }

  if (cliente) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{cliente.nome}</p>
          <p className="text-xs text-muted-foreground tabular-nums">{formatarTelefone(cliente.whatsapp)}{cliente.cidade ? ` · ${cliente.cidade}` : ""}</p>
        </div>
        {!desabilitado && <Button type="button" variant="ghost" size="sm" onClick={() => { onSelecionar(null); setQ(""); setAberto(true); }} aria-label="Trocar cliente"><X className="mr-1 h-4 w-4" aria-hidden />Trocar</Button>}
      </div>
    );
  }

  const busca = interpretarBuscaCliente(q);
  const pareceTelefone = busca.nomes.length === 0 && busca.digitos.join("").length >= 8;

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setAberto(true)}
          placeholder="Nome ou telefone do cliente" inputMode="search" autoComplete="off" className="h-11 pl-9"
          role="combobox" aria-expanded={aberto} aria-controls={idLista} aria-label="Buscar cliente por nome ou telefone"
        />
        {carregando && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden />}
      </div>

      {aberto && (
        <div id={idLista} role="listbox" aria-label="Clientes encontrados" className="overflow-hidden rounded-lg border border-border bg-card">
          <p className="sr-only" aria-live="polite">{carregando ? "Buscando clientes" : `${itens.length} clientes encontrados`}</p>
          {erro && <p role="alert" className="px-3 py-2 text-sm text-danger">{erro}</p>}
          {!erro && !carregando && itens.length === 0 && (
            <div className="space-y-2 px-3 py-3 text-sm">
              <p className="text-muted-foreground">{q.trim() ? "Nenhum cliente encontrado com essa busca." : "Nenhum cliente cadastrado ainda."}</p>
            </div>
          )}
          <ul className="divide-y divide-border">
            {itens.map((c) => (
              <li key={c.id} role="option" aria-selected={false}>
                <button type="button" onClick={() => { onSelecionar(c); setAberto(false); }} className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.nome}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">{formatarTelefone(c.whatsapp)}{c.cidade ? ` · ${c.cidade}` : ""}{c.clienteDesde ? ` · cliente desde ${new Date(c.clienteDesde).toLocaleDateString("pt-BR", { month: "2-digit", year: "numeric" })}` : ""}</p>
                  </div>
                  {c.orcamentosAbertos > 0 && <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs text-warning">{c.orcamentosAbertos} {c.orcamentosAbertos === 1 ? "proposta aberta" : "propostas abertas"}</span>}
                </button>
              </li>
            ))}
          </ul>
          {temMais && <button type="button" onClick={maisResultados} disabled={carregando} className="w-full border-t border-border px-3 py-2.5 text-sm font-medium text-primary hover:bg-accent disabled:opacity-60">Ver mais resultados</button>}
          <div className="border-t border-border bg-secondary/50 px-3 py-2">
            <button type="button" onClick={() => setCadastrando(true)} className="inline-flex min-h-9 items-center gap-2 text-sm font-medium text-primary">
              <UserPlus className="h-4 w-4" aria-hidden /> Cadastrar novo cliente{pareceTelefone ? ` com ${formatarTelefone(busca.digitos.join(""))}` : ""}
            </button>
          </div>
        </div>
      )}

      {cadastrando && (
        <NovoCliente
          nomeInicial={busca.nomes.join(" ")} telefoneInicial={pareceTelefone ? busca.digitos.join("") : busca.digitos.join("")}
          onCancelar={() => setCadastrando(false)} onPronto={(c) => { setCadastrando(false); onSelecionar(c); setAberto(false); }}
        />
      )}
    </div>
  );
}

function NovoCliente({ nomeInicial, telefoneInicial, onCancelar, onPronto }: { nomeInicial: string; telefoneInicial: string; onCancelar: () => void; onPronto: (c: ClienteResultado) => void }) {
  const [nome, setNome] = useState(nomeInicial);
  const [telefone, setTelefone] = useState(formatarTelefone(telefoneInicial));
  const [erro, setErro] = useState<string | null>(null);
  const [conflito, setConflito] = useState<Extract<ResultadoCadastroRapido, { status: "existente" | "similar" }> | null>(null);
  const [pendente, start] = useTransition();

  function cadastrar(confirmarSimilar = false) {
    setErro(null);
    start(async () => {
      const r = await cadastrarClienteRapidoAction({ nome, telefone, confirmarSimilar });
      if (!r.success) return setErro(r.error);
      if (r.data.status === "criado") return onPronto(r.data.cliente);
      setConflito(r.data);
    });
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-3" role="group" aria-label="Cadastrar novo cliente">
      <p className="text-sm font-medium">Novo cliente</p>
      <label className="flex flex-col gap-1 text-sm"><span>Nome</span><Input value={nome} onChange={(e) => { setNome(e.target.value); setConflito(null); }} autoComplete="off" /></label>
      <label className="flex flex-col gap-1 text-sm"><span>WhatsApp com DDD</span><Input value={telefone} onChange={(e) => { setTelefone(formatarTelefone(e.target.value)); setConflito(null); }} inputMode="tel" placeholder="(34) 99999-0000" /></label>

      {conflito?.status === "existente" && (
        <div role="alert" className="space-y-2 rounded-md bg-warning-soft p-3 text-sm">
          <p className="font-medium text-warning">Esse telefone já está cadastrado.</p>
          {conflito.candidatos.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2">
              <span>{c.nome} · {formatarTelefone(c.whatsapp)}</span>
              <Button type="button" size="sm" onClick={() => onPronto({ id: c.id, nome: c.nome, whatsapp: c.whatsapp, cidade: null, clienteDesde: null, orcamentosAbertos: 0 })}>Usar este cadastro</Button>
            </div>
          ))}
        </div>
      )}
      {conflito?.status === "similar" && (
        <div role="alert" className="space-y-2 rounded-md bg-warning-soft p-3 text-sm">
          <p className="font-medium text-warning">Já existe um número parecido. É a mesma pessoa?</p>
          {conflito.candidatos.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2">
              <span>{c.nome} · {formatarTelefone(c.whatsapp)}</span>
              <Button type="button" size="sm" variant="outline" onClick={() => onPronto({ id: c.id, nome: c.nome, whatsapp: c.whatsapp, cidade: null, clienteDesde: null, orcamentosAbertos: 0 })}>É essa pessoa</Button>
            </div>
          ))}
          <Button type="button" size="sm" variant="ghost" disabled={pendente} onClick={() => cadastrar(true)}>Não é, cadastrar mesmo assim</Button>
        </div>
      )}

      {erro && <p role="alert" className="text-sm text-danger">{erro}</p>}
      <div className="flex gap-2">
        <Button type="button" disabled={pendente || conflito !== null} onClick={() => cadastrar(false)}>{pendente ? "Cadastrando…" : "Cadastrar e selecionar"}</Button>
        <Button type="button" variant="ghost" onClick={onCancelar}>Cancelar</Button>
      </div>
    </div>
  );
}
