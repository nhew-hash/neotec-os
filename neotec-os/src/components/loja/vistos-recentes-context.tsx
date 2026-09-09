"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface VistoRecente {
  id: string;
  nome: string;
  slug: string;
  preco: number | null;
}

interface VistosRecentesContextValue {
  itens: VistoRecente[];
  registrar: (produto: VistoRecente) => void;
}

const VistosRecentesContext = createContext<VistosRecentesContextValue | null>(null);
const CHAVE_STORAGE = "neotec-loja-vistos-recentes";
const MAX_ITENS = 8;

export function VistosRecentesProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<VistoRecente[]>([]);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE_STORAGE);
      if (salvo) setItens(JSON.parse(salvo));
    } catch {
      // ignora — começa vazio
    }
    setCarregado(true);
  }, []);

  useEffect(() => {
    if (!carregado) return;
    localStorage.setItem(CHAVE_STORAGE, JSON.stringify(itens));
  }, [itens, carregado]);

  function registrar(produto: VistoRecente) {
    setItens((prev) => {
      const semEsse = prev.filter((p) => p.id !== produto.id);
      return [produto, ...semEsse].slice(0, MAX_ITENS);
    });
  }

  return <VistosRecentesContext.Provider value={{ itens, registrar }}>{children}</VistosRecentesContext.Provider>;
}

export function useVistosRecentes(): VistosRecentesContextValue {
  const ctx = useContext(VistosRecentesContext);
  if (!ctx) throw new Error("useVistosRecentes precisa estar dentro de <VistosRecentesProvider>");
  return ctx;
}
