"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Copy, ExternalLink, FileText, Search, Smartphone } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/format";
import { GRUPOS_CATALOGO, filtrarCatalogo, paramItensProposta, textoDoItem, type GrupoCatalogo, type ItemCatalogo, type OrdemCatalogo } from "@/services/central-comercial/catalogo";

const chave = (i: ItemCatalogo) => `${i.tipo}:${i.id}`;

function corBateria(b: number) {
  return b >= 85 ? "text-success-text" : b >= 80 ? "text-warning-text" : "text-danger";
}

/**
 * Vitrine para a vendedora: tudo o que tem para vender agora, com foto,
 * bateria e preço. Seleciona um ou vários para copiar a mensagem do WhatsApp
 * ou abrir a proposta já com os itens.
 */
export function CatalogoVenda({ itens, clienteId }: { itens: ItemCatalogo[]; clienteId?: string | null }) {
  const [texto, setTexto] = useState("");
  const [grupo, setGrupo] = useState<GrupoCatalogo | "todos">("todos");
  const [precoMax, setPrecoMax] = useState("");
  const [ordem, setOrdem] = useState<OrdemCatalogo>("relevancia");
  const [selecionados, setSelecionados] = useState<Map<string, ItemCatalogo>>(new Map());
  const [copiado, setCopiado] = useState<string | null>(null);
  const [erroCopia, setErroCopia] = useState<string | null>(null);

  const contagem = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of itens) m.set(i.grupo, (m.get(i.grupo) ?? 0) + 1);
    return m;
  }, [itens]);
  const lista = useMemo(
    () => filtrarCatalogo(itens, { texto, grupo, precoMax: Number(precoMax.replace(/\D/g, "")) || null, ordem }),
    [itens, texto, grupo, precoMax, ordem],
  );

  function alternar(i: ItemCatalogo) {
    setSelecionados((atual) => {
      const novo = new Map(atual);
      if (novo.has(chave(i))) novo.delete(chave(i)); else novo.set(chave(i), i);
      return novo;
    });
  }

  async function copiar(itensTexto: ItemCatalogo[], id: string) {
    setErroCopia(null);
    try {
      await navigator.clipboard.writeText(textoDoItem(itensTexto));
      setCopiado(id);
      setTimeout(() => setCopiado((c) => (c === id ? null : c)), 2000);
    } catch {
      setErroCopia("Não consegui copiar automaticamente. Selecione o texto na proposta ou tente de novo.");
    }
  }

  const escolhidos = [...selecionados.values()];
  const paraProposta = paramItensProposta(escolhidos);
  const hrefProposta = `/central-comercial/proposta?itens=${paraProposta}${clienteId ? `&cliente=${clienteId}` : ""}`;

  return (
    <div className="space-y-4 pb-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar: iphone 13 128, azul, carregador…" className="h-11 pl-9" aria-label="Buscar no catálogo" />
        </div>
        <div className="flex gap-2">
          <Input value={precoMax} onChange={(e) => setPrecoMax(e.target.value)} inputMode="numeric" placeholder="Até R$" className="h-11 w-28" aria-label="Preço máximo" />
          <select value={ordem} onChange={(e) => setOrdem(e.target.value as OrdemCatalogo)} className="h-11 rounded-md border border-input bg-background px-2 text-sm" aria-label="Ordenar">
            <option value="relevancia">Nome</option>
            <option value="menor_preco">Menor preço</option>
            <option value="maior_preco">Maior preço</option>
          </select>
        </div>
      </div>

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Categorias">
        {[{ id: "todos" as const, label: "Tudo" }, ...GRUPOS_CATALOGO].map((g) => {
          const n = g.id === "todos" ? itens.length : contagem.get(g.id) ?? 0;
          if (g.id !== "todos" && n === 0) return null;
          return (
            <button key={g.id} type="button" role="tab" aria-selected={grupo === g.id} onClick={() => setGrupo(g.id)}
              className={cn("h-8 shrink-0 rounded-full px-3 text-sm transition-colors", grupo === g.id ? "bg-foreground text-background" : "bg-secondary text-foreground hover:bg-secondary/70")}>
              {g.label} <span className="tabular-nums opacity-60">{n}</span>
            </button>
          );
        })}
      </div>

      {erroCopia && <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{erroCopia}</p>}

      {lista.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Nada encontrado com esses filtros.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {lista.map((i) => {
            const sel = selecionados.has(chave(i));
            return (
              <li key={chave(i)} className={cn("flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card transition-shadow", sel ? "border-primary ring-2 ring-primary/30" : "border-border")}>
                <button type="button" onClick={() => alternar(i)} aria-pressed={sel} className="relative flex aspect-square items-center justify-center bg-[#F5F5F7]">
                  {i.foto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.foto} alt="" loading="lazy" className="h-full w-full object-contain p-3" />
                  ) : (
                    <Smartphone className="h-12 w-12 text-black/10" strokeWidth={1} aria-hidden />
                  )}
                  <span className={cn("absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 bg-white", sel ? "border-primary bg-primary text-white" : "border-black/20")}>
                    {sel && <Check className="h-3.5 w-3.5" aria-hidden />}
                    <span className="sr-only">{sel ? "Selecionado" : "Selecionar"}</span>
                  </span>
                  {i.quantidade > 1 && <span className="absolute right-2 top-2 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium tabular-nums">{i.quantidade} un.</span>}
                </button>
                <div className="flex flex-1 flex-col gap-1 p-3">
                  <p className="line-clamp-2 text-sm font-medium leading-snug">{i.nome}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {i.detalhes.map((d, idx) => (
                      <span key={d} className={cn(d.startsWith("Bateria") && i.bateria != null && corBateria(i.bateria))}>{idx > 0 ? " · " : ""}{d}</span>
                    ))}
                  </p>
                  <p className="mt-auto pt-1 text-base font-semibold tabular-nums">{i.tipo === "lacrado" && <span className="text-xs font-normal text-muted-foreground">a partir de </span>}{formatCurrency(i.preco)}</p>
                  <div className="flex items-center gap-1 pt-1">
                    <Button type="button" variant="outline" size="sm" className="h-8 flex-1 px-2 text-xs" onClick={() => copiar([i], chave(i))}>
                      {copiado === chave(i) ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copiado === chave(i) ? "Copiado" : "Copiar"}
                    </Button>
                    {i.linkLoja && (
                      <a href={i.linkLoja} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "ghost", size: "sm", className: "h-8 w-8 p-0" })} aria-label={`Ver ${i.nome} na loja`}>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {escolhidos.length > 0 && (
        <div className="sticky bottom-20 z-30 rounded-xl border border-border bg-background/95 p-3 shadow-lg backdrop-blur md:bottom-4">
          <div className="flex items-center gap-2">
            <p className="mr-auto text-sm"><strong className="tabular-nums">{escolhidos.length}</strong><span className="hidden sm:inline"> {escolhidos.length === 1 ? "item selecionado" : "itens selecionados"}</span><span className="sm:hidden"> sel.</span></p>
            <Button type="button" variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={() => setSelecionados(new Map())}>Limpar</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => copiar(escolhidos, "selecao")}>
              {copiado === "selecao" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}<span className="hidden sm:inline">Copiar para WhatsApp</span><span className="sm:hidden">Copiar</span>
            </Button>
            {paraProposta ? (
              <Link href={hrefProposta} className={buttonVariants({ size: "sm" })}><FileText className="h-4 w-4" /><span className="hidden sm:inline">Montar proposta</span><span className="sm:hidden">Proposta</span></Link>
            ) : (
              <span className="text-xs text-muted-foreground">Lacrado ainda não entra na proposta.</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
