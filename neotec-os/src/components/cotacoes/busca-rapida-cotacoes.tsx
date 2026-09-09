"use client";

import { useState, useTransition, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buscarItensCotacaoAction } from "@/services/cotacoes/cotacoes.actions";
import { formatCurrency, formatDate } from "@/utils";
import type { ItemComCotacao } from "@/services/cotacoes/cotacoes-busca.service";

export function BuscaRapidaCotacoes() {
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<ItemComCotacao[] | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!termo.trim()) {
      setResultados(null);
      return;
    }
    const timeout = setTimeout(() => {
      startTransition(async () => {
        const result = await buscarItensCotacaoAction(termo);
        setResultados(result.success ? result.data : []);
      });
    }, 300);

    return () => clearTimeout(timeout);
  }, [termo]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder='Ex: "15 pro", "16 preto", "14 acima de 90%", "13 256"...'
          className="pl-9"
        />
        {isPending && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">buscando...</span>}
      </div>

      {resultados != null && (
        <Card>
          <CardContent className="flex flex-col gap-2 p-4">
            {resultados.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhum aparelho encontrado com esses termos.</p>
            ) : (
              resultados.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-2.5 text-sm">
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">
                      {item.modelo} {item.armazenamento && `· ${item.armazenamento}`} {item.cor && `· ${item.cor}`}
                      {item.bateria_percentual != null && ` · ${item.bateria_percentual}%`}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {item.cotacao.fornecedor} · {formatDate(item.cotacao.data_cotacao)} · {item.cotacao.categoria}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.cotacao.status === "arquivada" && <Badge variant="secondary" className="text-[10px]">Arquivada</Badge>}
                    <span className="font-display font-semibold text-foreground">{formatCurrency(item.preco)}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
