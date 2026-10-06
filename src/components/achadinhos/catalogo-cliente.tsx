"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import type { ProdutoPublico } from "@/lib/achadinhos/tipos";
import { cn } from "@/lib/utils";
import { CardProduto } from "./card-produto";
import { TITULO } from "./estilos";

/** Minúsculas e sem acento: "cabo usb-c" encontra "Cabo USB‑C" e "fone" encontra "Fóne". */
function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Catálogo com busca e filtro por categoria. A lista inteira já vem
 * renderizada do servidor (bom pra SEO e pra abrir rápido); a busca só
 * filtra o que já está na página, na hora, sem ir ao servidor.
 */
export function CatalogoCliente({ produtos, categorias }: { produtos: ProdutoPublico[]; categorias: string[] }) {
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<string | null>(null);
  const buscaAdiada = useDeferredValue(busca);
  const campoBusca = useRef<HTMLInputElement>(null);

  // O ícone de lupa do cabeçalho leva pra /achadinhos#busca — foca o campo.
  useEffect(() => {
    const focarSeHash = () => {
      if (window.location.hash === "#busca") campoBusca.current?.focus({ preventScroll: false });
    };
    focarSeHash();
    window.addEventListener("hashchange", focarSeHash);
    return () => window.removeEventListener("hashchange", focarSeHash);
  }, []);

  const indice = useMemo(
    () => produtos.map((p) => ({ p, texto: normalizar([p.nome, p.categoria ?? "", ...p.tags].join(" ")) })),
    [produtos]
  );

  const filtrados = useMemo(() => {
    const termos = normalizar(buscaAdiada).split(/\s+/).filter(Boolean);
    return indice
      .filter(({ p, texto }) => (!categoria || p.categoria === categoria) && termos.every((t) => texto.includes(t)))
      .map(({ p }) => p);
  }, [indice, buscaAdiada, categoria]);

  const filtrando = busca.trim() !== "" || categoria !== null;
  const limpar = () => {
    setBusca("");
    setCategoria(null);
  };

  return (
    <section id="catalogo" aria-labelledby="titulo-catalogo" className="scroll-mt-16">
      <div className="sticky top-16 z-20 border-b border-achados-line bg-achados-mist/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-achados-muted" aria-hidden />
            <input
              ref={campoBusca}
              id="busca"
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar fone, carregador, cabo…"
              aria-label="Buscar achadinhos"
              autoComplete="off"
              className="h-12 w-full rounded-2xl border-0 bg-white pl-11 pr-11 text-base text-achados-navy shadow-sm ring-1 ring-achados-line placeholder:text-achados-muted/80 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca("")}
                aria-label="Limpar busca"
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-achados-muted hover:bg-achados-mist hover:text-achados-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>

          {categorias.length > 0 && (
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Filtrar por categoria">
              {[null, ...categorias].map((c) => {
                const ativo = categoria === c;
                return (
                  <button
                    key={c ?? "todas"}
                    type="button"
                    onClick={() => setCategoria(c)}
                    aria-pressed={ativo}
                    className={cn(
                      "h-9 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-achados-mist",
                      ativo ? "bg-achados-navy text-white" : "bg-white text-achados-navy ring-1 ring-achados-line hover:bg-white hover:ring-achados-navy/40"
                    )}
                  >
                    {c ?? "Todos"}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-16 pt-8">
        <div className="mb-5 flex items-baseline justify-between gap-4">
          <h2 id="titulo-catalogo" className={cn(TITULO, "text-2xl font-extrabold tracking-tight text-achados-navy sm:text-3xl")}>
            {categoria ?? "Todos os achadinhos"}
          </h2>
          <p className="shrink-0 text-sm text-achados-muted" aria-live="polite">
            {filtrados.length} {filtrados.length === 1 ? "achadinho" : "achadinhos"}
          </p>
        </div>

        {produtos.length === 0 ? (
          <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-achados-line">
            <p className={cn(TITULO, "text-xl font-extrabold text-achados-navy")}>Estamos garimpando as primeiras ofertas</p>
            <p className="mx-auto mt-2 max-w-md text-achados-muted">Ainda não tem achadinho no ar. Volte em breve: a equipe da Neotec está selecionando o que vale a pena.</p>
          </div>
        ) : filtrados.length === 0 ? (
          <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-achados-line">
            <p className={cn(TITULO, "text-xl font-extrabold text-achados-navy")}>Nenhum achadinho com esses filtros</p>
            <p className="mx-auto mt-2 max-w-md text-achados-muted">Tente outra palavra ou escolha outra categoria.</p>
            {filtrando && (
              <button
                type="button"
                onClick={limpar}
                className="mt-5 h-11 rounded-2xl bg-achados-navy px-5 text-sm font-bold text-white hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
            {filtrados.map((p, i) => (
              <li key={p.id}>
                <CardProduto produto={p} prioridade={i < 4} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
