"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface ItemCarrinho {
  tipo: "produto" | "aparelho";
  id: string;
  nome: string;
  detalhe?: string; // ex: "128GB Azul, seminovo"
  valor: number;
  quantidade: number;
}

interface CarrinhoContextValue {
  itens: ItemCarrinho[];
  adicionar: (item: Omit<ItemCarrinho, "quantidade">) => void;
  remover: (tipo: string, id: string) => void;
  atualizarQuantidade: (tipo: string, id: string, quantidade: number) => void;
  limpar: () => void;
  total: number;
  totalItens: number;
}

const CarrinhoContext = createContext<CarrinhoContextValue | null>(null);

const CHAVE_STORAGE = "neotec-loja-carrinho";

export function CarrinhoProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<ItemCarrinho[]>([]);
  const [carregado, setCarregado] = useState(false);

  // Carrega do localStorage só depois de montar (evita mismatch de
  // hidratação entre servidor e cliente).
  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE_STORAGE);
      if (salvo) setItens(JSON.parse(salvo));
    } catch {
      // localStorage indisponível ou corrompido — começa vazio, sem travar a loja.
    }
    setCarregado(true);
  }, []);

  useEffect(() => {
    if (!carregado) return;
    localStorage.setItem(CHAVE_STORAGE, JSON.stringify(itens));
  }, [itens, carregado]);

  function adicionar(novoItem: Omit<ItemCarrinho, "quantidade">) {
    setItens((prev) => {
      const existente = prev.find((i) => i.tipo === novoItem.tipo && i.id === novoItem.id);
      if (existente) {
        return prev.map((i) => (i === existente ? { ...i, quantidade: i.quantidade + 1 } : i));
      }
      return [...prev, { ...novoItem, quantidade: 1 }];
    });
  }

  function remover(tipo: string, id: string) {
    setItens((prev) => prev.filter((i) => !(i.tipo === tipo && i.id === id)));
  }

  function atualizarQuantidade(tipo: string, id: string, quantidade: number) {
    if (quantidade < 1) return remover(tipo, id);
    setItens((prev) => prev.map((i) => (i.tipo === tipo && i.id === id ? { ...i, quantidade } : i)));
  }

  function limpar() {
    setItens([]);
  }

  const total = itens.reduce((acc, i) => acc + i.valor * i.quantidade, 0);
  const totalItens = itens.reduce((acc, i) => acc + i.quantidade, 0);

  return (
    <CarrinhoContext.Provider value={{ itens, adicionar, remover, atualizarQuantidade, limpar, total, totalItens }}>
      {children}
    </CarrinhoContext.Provider>
  );
}

export function useCarrinho(): CarrinhoContextValue {
  const ctx = useContext(CarrinhoContext);
  if (!ctx) throw new Error("useCarrinho precisa estar dentro de <CarrinhoProvider>");
  return ctx;
}
