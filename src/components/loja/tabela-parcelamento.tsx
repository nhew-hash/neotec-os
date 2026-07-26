"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { buscarTabelaParcelasAction, type OpcaoParcela } from "@/services/pagamentos/payment.controller";
import { formatCurrency } from "@/utils";

/**
 * A tabela só é buscada quando o cliente clica — nunca automática no
 * carregamento da página, pra não bater na API do Mercado Pago em
 * toda visita de produto. Dado real (cache de 1h no servidor), nunca
 * "sem juros" assumido — mostra a taxa de verdade quando ela existe.
 */
export function TabelaParcelamento({ valor }: { valor: number }) {
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [opcoes, setOpcoes] = useState<OpcaoParcela[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function handleAbrir() {
    if (aberto) return setAberto(false);
    setAberto(true);
    if (opcoes) return; // já buscou antes — não busca de novo

    setCarregando(true);
    setErro(null);
    const result = await buscarTabelaParcelasAction(valor);
    setCarregando(false);

    if (!result.success) return setErro(result.error);
    setOpcoes(result.data.opcoes);
  }

  return (
    <div>
      <button type="button" onClick={handleAbrir} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
        Ver opções de parcelamento{aberto ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {aberto && (
        <div className="mt-2 rounded-xl border border-black/[0.06] p-2">
          {carregando && (
            <div className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />Consultando parcelas...
            </div>
          )}
          {erro && <p className="p-2 text-xs text-danger">{erro}</p>}
          {opcoes && opcoes.length === 0 && <p className="p-2 text-xs text-muted-foreground">Nenhuma opção de parcelamento disponível pra esse valor.</p>}
          {opcoes && opcoes.length > 0 && (
            <table className="w-full text-xs">
              <tbody>
                {opcoes.map((o) => (
                  <tr key={o.parcelas} className="border-b border-black/[0.04] last:border-0">
                    <td className="py-1.5 pr-2 text-foreground">{o.parcelas}x de {formatCurrency(o.valorParcela)}</td>
                    <td className="py-1.5 text-right text-muted-foreground">
                      {o.temJuros ? `com juros — total ${formatCurrency(o.valorTotal)}` : "sem juros"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
