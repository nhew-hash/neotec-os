"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface ComparadorContextValue {
  idsSelecionados: string[];
  alternar: (produtoId: string) => void;
  estaSelecionado: (produtoId: string) => boolean;
  limpar: () => void;
}

const ComparadorContext = createContext<ComparadorContextValue | null>(null);
const CHAVE_STORAGE = "neotec-loja-comparador";
const MAX_COMPARACAO = 3;

export function ComparadorProvider({ children }: { children: ReactNode }) {
  const [idsSelecionados, setIdsSelecionados] = useState<string[]>([]);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE_STORAGE);
      if (salvo) setIdsSelecionados(JSON.parse(salvo));
    } catch {
      // ignora — começa vazio
    }
    setCarregado(true);
  }, []);

  useEffect(() => {
    if (!carregado) return;
    localStorage.setItem(CHAVE_STORAGE, JSON.stringify(idsSelecionados));
  }, [idsSelecionados, carregado]);

  function alternar(produtoId: string) {
    setIdsSelecionados((prev) => {
      if (prev.includes(produtoId)) return prev.filter((id) => id !== produtoId);
      if (prev.length >= MAX_COMPARACAO) return prev; // já no limite — ignora silenciosamente, o botão já fica desabilitado
      return [...prev, produtoId];
    });
  }

  function estaSelecionado(produtoId: string) {
    return idsSelecionados.includes(produtoId);
  }

  function limpar() {
    setIdsSelecionados([]);
  }

  return (
    <ComparadorContext.Provider value={{ idsSelecionados, alternar, estaSelecionado, limpar }}>
      {children}
    </ComparadorContext.Provider>
  );
}

export function useComparador(): ComparadorContextValue {
  const ctx = useContext(ComparadorContext);
  if (!ctx) throw new Error("useComparador precisa estar dentro de <ComparadorProvider>");
  return ctx;
}

export const MAX_COMPARACAO_ITENS = MAX_COMPARACAO;
