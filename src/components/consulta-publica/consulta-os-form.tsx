"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/utils";
import type { StatusOS } from "@/types";

interface ResultadoConsulta {
  numero_os: string;
  status: StatusOS;
  prazo: string | null;
  valor: number | null;
  observacoes_publicas: string | null;
}

export function ConsultaOSForm() {
  const [numeroOs, setNumeroOs] = useState("");
  const [telefone, setTelefone] = useState("");
  const [resultado, setResultado] = useState<ResultadoConsulta | null | undefined>(undefined);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    setResultado(undefined);

    const supabase = createClient();
    const { data, error } = await supabase.rpc("consultar_os_publico", {
      p_numero_os: numeroOs.trim().toUpperCase(),
      p_telefone: telefone,
    });

    setCarregando(false);
    if (error || !data || data.length === 0) {
      setResultado(null);
      return;
    }
    setResultado(data[0]);
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input
          placeholder="Número da OS (ex: OS000123)"
          value={numeroOs}
          onChange={(e) => setNumeroOs(e.target.value)}
        />
        <Input
          placeholder="Telefone cadastrado"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
        />
        <Button type="submit" disabled={carregando}>
          {carregando ? "Consultando..." : "Consultar"}
        </Button>
      </form>

      {resultado === null && (
        <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
          Nenhuma OS encontrada com esses dados.
        </p>
      )}

      {resultado && (
        <Card>
          <CardContent className="flex flex-col gap-2 p-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-medium">{resultado.numero_os}</span>
              <Badge>{resultado.status}</Badge>
            </div>
            {resultado.prazo && (
              <p className="text-sm text-muted-foreground">Previsão: {formatDate(resultado.prazo)}</p>
            )}
            {resultado.valor != null && (
              <p className="text-sm text-muted-foreground">Orçamento: {formatCurrency(resultado.valor)}</p>
            )}
            {resultado.observacoes_publicas && (
              <p className="text-sm text-muted-foreground">{resultado.observacoes_publicas}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
