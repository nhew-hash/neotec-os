"use client";

import { useState } from "react";
import { Printer, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrintProvider } from "@/lib/print/use-print-provider";
import type { TipoDocumentoImpressao, FormatoImpressao } from "@/types";

interface BotaoImprimirProps {
  tipo: TipoDocumentoImpressao;
  id: string;
  formato?: FormatoImpressao;
  label?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "icon";
}

/**
 * Substitui os antigos <Link target="_blank"> de impressão. Quando o QZ
 * Tray está disponível, imprime direto (sem diálogo, sem aba nova).
 * Quando não está, cai pro MESMO comportamento de antes (abre a URL de
 * impressão numa aba nova, Ctrl+P do navegador) — ninguém perde
 * funcionalidade, só ganha a opção mais rápida quando possível.
 */
export function BotaoImprimir({ tipo, id, formato, label, variant = "outline", size = "sm" }: BotaoImprimirProps) {
  const { status, provider } = usePrintProvider();
  const [imprimindo, setImprimindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const urlPagina = `/impressao/${tipo}/${id}${formato ? `?formato=${formato}` : ""}`;

  async function handleClick() {
    setErro(null);

    if (status !== "qz-tray") {
      window.open(urlPagina, "_blank");
      return;
    }

    setImprimindo(true);
    try {
      const urlApi = `/api/impressao/${tipo}/${id}${formato ? `?formato=${formato}` : ""}`;
      const resposta = await fetch(urlApi);
      const dados = await resposta.json();

      if (!resposta.ok || !dados.html) {
        setErro(dados.erro ?? "Não foi possível carregar o documento");
        window.open(urlPagina, "_blank"); // fallback — não deixa o usuário sem imprimir
        return;
      }

      const resultado = await provider.imprimir({ html: dados.html });
      if (!resultado.sucesso) {
        setErro(resultado.motivo ?? "Falha ao imprimir");
        window.open(urlPagina, "_blank"); // fallback também aqui
      }
    } finally {
      setImprimindo(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button type="button" variant={variant} size={size} onClick={handleClick} disabled={imprimindo}>
        {imprimindo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : status === "qz-tray" ? <Zap className="h-3.5 w-3.5" /> : <Printer className="h-3.5 w-3.5" />}
        {label ?? "Imprimir"}
      </Button>
      {erro && <p className="text-[11px] text-danger">{erro}</p>}
    </div>
  );
}
