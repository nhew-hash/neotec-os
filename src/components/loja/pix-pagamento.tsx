"use client";

import { useState, useEffect } from "react";
import { Copy, Check, Clock } from "lucide-react";
import { usePixStatus, useContagemRegressiva } from "@/hooks/use-pagamento";

interface PixPagamentoProps {
  pagamentoId: string;
  qrCodeBase64: string | null;
  copiaCola: string | null;
  expiraEm: string | null;
  onAprovado: () => void;
}

export function PixPagamento({ pagamentoId, qrCodeBase64, copiaCola, expiraEm, onAprovado }: PixPagamentoProps) {
  const status = usePixStatus(pagamentoId, "pendente");
  const tempoRestante = useContagemRegressiva(expiraEm);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (status === "aprovado") onAprovado();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  function handleCopiar() {
    if (!copiaCola) return;
    navigator.clipboard.writeText(copiaCola);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      {qrCodeBase64 ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`data:image/png;base64,${qrCodeBase64}`} alt="QR Code Pix" className="h-56 w-56 rounded-2xl border border-black/[0.06]" />
      ) : (
        <div className="flex h-56 w-56 items-center justify-center rounded-2xl bg-secondary text-sm text-muted-foreground">QR Code indisponível</div>
      )}

      {copiaCola && (
        <button
          type="button"
          onClick={handleCopiar}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-black/[0.1] py-3 text-sm font-medium text-foreground hover:bg-secondary"
        >
          {copiado ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
          {copiado ? "Copiado!" : "Copiar código Pix"}
        </button>
      )}

      {tempoRestante && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />Expira em {tempoRestante}
        </p>
      )}

      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="h-2 w-2 animate-pulse rounded-full bg-warning" />Aguardando pagamento...
      </p>
    </div>
  );
}
