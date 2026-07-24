"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PenLine, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CapturaAssinatura } from "./captura-assinatura";
import type { TipoDocumentoImpressao, TipoAssinanteDocumento } from "@/types";

interface AssinaturaDigitalPanelProps {
  tipoDocumento: TipoDocumentoImpressao;
  referenciaId: string;
  jaColetadas: TipoAssinanteDocumento[];
}

export function AssinaturaDigitalPanel({ tipoDocumento, referenciaId, jaColetadas }: AssinaturaDigitalPanelProps) {
  const router = useRouter();
  const [assinando, setAssinando] = useState<TipoAssinanteDocumento | null>(null);

  return (
    <div className="flex items-center gap-2">
      {(["cliente", "tecnico"] as const).map((tipo) => {
        const coletada = jaColetadas.includes(tipo);
        return (
          <Button
            key={tipo}
            type="button"
            variant={coletada ? "outline" : "secondary"}
            size="sm"
            onClick={() => setAssinando(tipo)}
          >
            {coletada ? <Check className="h-3.5 w-3.5 text-success" /> : <PenLine className="h-3.5 w-3.5" />}
            Assinatura {tipo === "cliente" ? "do cliente" : "do técnico"}
          </Button>
        );
      })}

      {assinando && (
        <CapturaAssinatura
          aberto
          onFechar={() => setAssinando(null)}
          tipoDocumento={tipoDocumento}
          referenciaId={referenciaId}
          tipoAssinante={assinando}
          onSalvo={() => router.refresh()}
        />
      )}
    </div>
  );
}
