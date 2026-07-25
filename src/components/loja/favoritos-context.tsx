"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface FavoritosContextValue {
  idsFavoritos: string[];
  alternar: (produtoId: string) => void;
  ehFavorito: (produtoId: string) => boolean;
}

const FavoritosContext = createContext<FavoritosContextValue | null>(null);
const CHAVE_STORAGE = "neotec-loja-favoritos";

/**
 * Client-side, localStorage — mesmo padrão do carrinho e do
 * comparador. "Preparar para login futuro" (pedido) significa: quando
 * existir login de cliente na loja, essa lista pode migrar pra uma
 * tabela vinculada ao cliente sem mudar a interface que consome
 * `useFavoritos()` — só troca o que tem por dentro do provider.
 */
export function FavoritosProvider({ children }: { children: ReactNode }) {
  const [idsFavoritos, setIdsFavoritos] = useState<string[]>([]);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE_STORAGE);
      if (salvo) setIdsFavoritos(JSON.parse(salvo));
    } catch {
      // ignora — começa vazio
    }
    setCarregado(true);
  }, []);

  useEffect(() => {
    if (!carregado) return;
    localStorage.setItem(CHAVE_STORAGE, JSON.stringify(idsFavoritos));
  }, [idsFavoritos, carregado]);

  function alternar(produtoId: string) {
    setIdsFavoritos((prev) => (prev.includes(produtoId) ? prev.filter((id) => id !== produtoId) : [...prev, produtoId]));
  }

  function ehFavorito(produtoId: string) {
    return idsFavoritos.includes(produtoId);
  }

  return <FavoritosContext.Provider value={{ idsFavoritos, alternar, ehFavorito }}>{children}</FavoritosContext.Provider>;
}

export function useFavoritos(): FavoritosContextValue {
  const ctx = useContext(FavoritosContext);
  if (!ctx) throw new Error("useFavoritos precisa estar dentro de <FavoritosProvider>");
  return ctx;
}
