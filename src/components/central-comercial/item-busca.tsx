"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Loader2, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { buscarItensAction } from "@/services/central-comercial/central-comercial.actions";
import type { ItemBusca } from "@/services/central-comercial/itens-busca";
import { formatCurrency } from "@/utils/format";

/** Busca de aparelhos e produtos no servidor (modelo, capacidade, cor, condição, marca, IMEI). 10 por página. */
export function ItemBuscaCampo({ onAdicionar, jaNaProposta }: { onAdicionar: (item: ItemBusca) => void; jaNaProposta: Set<string> }) {
  const idLista = useId();
  const [q, setQ] = useState("");
  const [aberto, setAberto] = useState(false);
  const [itens, setItens] = useState<ItemBusca[]>([]);
  const [temMais, setTemMais] = useState(false);
  const [truncado, setTruncado] = useState(false);
  const [pagina, setPagina] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const requisicao = useRef(0);

  useEffect(() => {
    if (!aberto) return;
    const minha = ++requisicao.current;
    const t = setTimeout(async () => {
      setCarregando(true); setErro(null);
      const r = await buscarItensAction(q, 0);
      if (minha !== requisicao.current) return;
      setCarregando(false);
      if (!r.success) { setErro(r.error); setItens([]); return; }
      setItens(r.data.itens); setTemMais(r.data.temMais); setTruncado(r.data.truncado); setPagina(0);
    }, q.trim() ? 300 : 0);
    return () => clearTimeout(t);
  }, [q, aberto]);

  async function maisResultados() {
    const minha = ++requisicao.current;
    setCarregando(true);
    const r = await buscarItensAction(q, pagina + 1);
    if (minha !== requisicao.current) return;
    setCarregando(false);
    if (!r.success) return setErro(r.error);
    setItens((a) => [...a, ...r.data.itens]); setTemMais(r.data.temMais); setPagina((p) => p + 1);
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setAberto(true)} autoComplete="off" className="h-11 pl-9"
          placeholder="Modelo, capacidade, cor… ex.: iphone 13 128 roxo" role="combobox" aria-expanded={aberto} aria-controls={idLista} aria-label="Buscar aparelho ou produto" />
        {carregando && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden />}
      </div>
      {aberto && (
        <div id={idLista} role="listbox" aria-label="Itens encontrados" className="max-h-96 overflow-y-auto rounded-lg border border-border bg-card">
          <p className="sr-only" aria-live="polite">{carregando ? "Buscando itens" : `${itens.length} itens encontrados`}</p>
          {erro && <p role="alert" className="px-3 py-2 text-sm text-danger">{erro}</p>}
          {!erro && !carregando && itens.length === 0 && <p className="px-3 py-3 text-sm text-muted-foreground">{q.trim() ? "Nada disponível com essa busca. Tente menos palavras." : "Nenhum item disponível para venda."}</p>}
          <ul className="divide-y divide-border">
            {itens.map((i) => {
              const ja = jaNaProposta.has(`${i.tipo}:${i.id}`);
              return (
                <li key={`${i.tipo}:${i.id}`} role="option" aria-selected={ja}>
                  <button type="button" disabled={ja && i.tipo === "aparelho"} onClick={() => onAdicionar(i)} className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none disabled:opacity-50">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{i.rotulo}</p>
                      <p className="text-xs text-muted-foreground">{i.tipo === "aparelho" ? "Aparelho" : "Produto"}{i.detalhe ? ` · ${i.detalhe}` : ""}</p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">{formatCurrency(i.preco)}</span>
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden><Plus className="h-4 w-4" /></span>
                  </button>
                </li>
              );
            })}
          </ul>
          {temMais && <button type="button" onClick={maisResultados} disabled={carregando} className="w-full border-t border-border px-3 py-2.5 text-sm font-medium text-primary hover:bg-accent disabled:opacity-60">Ver mais resultados</button>}
          {truncado && <p className="border-t border-border bg-warning-soft px-3 py-2 text-xs text-warning">Há muitos itens para esta busca. Digite mais detalhes (cor, capacidade) para refinar.</p>}
        </div>
      )}
    </div>
  );
}
