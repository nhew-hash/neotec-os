"use client";

import { useState } from "react";

export interface EnderecoCep {
  rua: string;
  bairro: string;
  cidade: string;
  estado: string;
}

/** Busca endereço pelo CEP via ViaCEP — serviço público, gratuito, sem chave de API. Só dispara quando o CEP tiver os 8 dígitos completos. */
export function useBuscaCep() {
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function buscar(cepDigitado: string): Promise<EnderecoCep | null> {
    const cep = cepDigitado.replace(/\D/g, "");
    if (cep.length !== 8) return null;

    setBuscando(true);
    setErro(null);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) {
        setErro("CEP não encontrado — confere se digitou certo.");
        return null;
      }
      return { rua: data.logradouro ?? "", bairro: data.bairro ?? "", cidade: data.localidade ?? "", estado: data.uf ?? "" };
    } catch {
      setErro("Não consegui buscar o CEP agora — preenche o endereço manualmente.");
      return null;
    } finally {
      setBuscando(false);
    }
  }

  return { buscar, buscando, erro };
}
