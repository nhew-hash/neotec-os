"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Search, X, Smartphone } from "lucide-react";
import { formatCurrency } from "@/utils";
import type { ProdutoLoja } from "@/types";

export function BuscaLoja() {
  const [aberto, setAberto] = useState(false);
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<ProdutoLoja[]>([]);
  const [buscando, setBuscando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (termo.trim().length < 2) {
      setResultados([]);
      return;
    }
    setBuscando(true);
    const timer = setTimeout(() => {
      fetch(`/api/loja/busca?q=${encodeURIComponent(termo)}`)
        .then((r) => r.json())
        .then((d) => setResultados(d.produtos ?? []))
        .finally(() => setBuscando(false));
    }, 250); // debounce — não busca a cada tecla, espera a pessoa parar de digitar

    return () => clearTimeout(timer);
  }, [termo]);

  function abrir() {
    setAberto(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function fechar() {
    setAberto(false);
    setTermo("");
  }

  if (!aberto) {
    return (
      <button type="button" onClick={abrir} className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-secondary" title="Buscar">
        <Search className="h-5 w-5 text-foreground" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 pt-6">
        <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && fechar()}
          placeholder="Buscar iPhone, iPad, acessório..."
          className="flex-1 border-none bg-transparent text-lg text-foreground outline-none placeholder:text-muted-foreground"
        />
        <button type="button" onClick={fechar} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-secondary">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mx-auto mt-6 w-full max-w-2xl flex-1 overflow-y-auto px-4">
        {buscando && <p className="text-center text-sm text-muted-foreground">Buscando...</p>}

        {!buscando && termo.length >= 2 && resultados.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">Nenhum produto encontrado pra "{termo}".</p>
        )}

        <div className="flex flex-col gap-1">
          {resultados.map((p) => (
            <Link
              key={p.id}
              href={p.slug ? `/loja/produto/${p.slug}` : "#"}
              onClick={fechar}
              className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-secondary"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#FAFBFC]">
                <Smartphone className="h-5 w-5 text-black/15" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{p.nome}</p>
                {p.preco_venda != null && <p className="text-xs text-muted-foreground">{formatCurrency(p.preco_venda)}</p>}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
