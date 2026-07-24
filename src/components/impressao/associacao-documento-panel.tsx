"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { definirPreferenciaAction } from "@/services/impressao/impressoras.actions";
import type { Impressora, ImpressoraDocumentoPreferencia, TipoDocumentoImpressao } from "@/types";

const DOCUMENTOS: { tipo: TipoDocumentoImpressao; label: string }[] = [
  { tipo: "os", label: "Ordem de Serviço" },
  { tipo: "orcamento", label: "Orçamento" },
  { tipo: "venda", label: "Venda" },
  { tipo: "recibo", label: "Recibo" },
  { tipo: "etiqueta", label: "Etiquetas" },
  { tipo: "garantia", label: "Garantia" },
  { tipo: "termo_entrega", label: "Termo de entrega" },
  { tipo: "termo_entrada", label: "Termo de entrada" },
];

interface AssociacaoDocumentoPanelProps {
  impressoras: Impressora[];
  preferenciasLoja: ImpressoraDocumentoPreferencia[];
  preferenciasUsuario: ImpressoraDocumentoPreferencia[];
}

export function AssociacaoDocumentoPanel({ impressoras, preferenciasLoja, preferenciasUsuario }: AssociacaoDocumentoPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleAlterar(tipo: TipoDocumentoImpressao, impressoraId: string, paraLojaInteira: boolean) {
    startTransition(async () => {
      await definirPreferenciaAction(tipo, impressoraId, paraLojaInteira);
      router.refresh();
    });
  }

  if (impressoras.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Associação por documento</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Cadastre uma impressora primeiro pra poder associar aos documentos.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle>Associação por documento</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-xs text-muted-foreground">
          Define qual impressora cada documento usa por padrão. "Só pra mim" sobrescreve o padrão da loja quando
          você mesmo estiver imprimindo.
        </p>
        {DOCUMENTOS.map(({ tipo, label }) => {
          const prefUsuario = preferenciasUsuario.find((p) => p.tipo_documento === tipo);
          const prefLoja = preferenciasLoja.find((p) => p.tipo_documento === tipo);
          const valorAtual = prefUsuario?.impressora_id ?? prefLoja?.impressora_id ?? "";

          return (
            <div key={tipo} className="flex flex-wrap items-center gap-2 border-b border-border pb-3 last:border-0">
              <span className="w-40 text-sm text-foreground">{label}</span>
              <Select
                value={valorAtual}
                disabled={isPending}
                onValueChange={(impressoraId) => handleAlterar(tipo, impressoraId, !prefUsuario)}
              >
                <SelectTrigger className="w-56"><SelectValue placeholder="Perguntar sempre" /></SelectTrigger>
                <SelectContent>
                  {impressoras.map((imp) => <SelectItem key={imp.id} value={imp.id}>{imp.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">
                {prefUsuario ? "Só pra mim" : prefLoja ? "Padrão da loja" : "Sem preferência definida"}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
