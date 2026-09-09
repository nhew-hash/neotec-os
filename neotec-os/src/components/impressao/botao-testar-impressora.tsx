"use client";

import { useState } from "react";
import { Loader2, Zap, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrintProvider } from "@/lib/print/use-print-provider";

const HTML_TESTE = `
<div style="font-family: Arial, sans-serif; max-width: 720px; margin: 0 auto;">
  <h1 style="font-size: 20px; font-weight: 700; color: #2643D6;">Página de teste — Neotec OS</h1>
  <p>Se você está vendo isso impresso, a impressora está configurada corretamente.</p>
  <p style="font-size: 11px; color: #888;">Gerado em ${new Date().toLocaleString("pt-BR")}</p>
</div>`;

export function BotaoTestarImpressora({ nomeImpressora }: { nomeImpressora: string }) {
  const { status, provider } = usePrintProvider();
  const [testando, setTestando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleTestar() {
    setErro(null);

    if (status !== "qz-tray") {
      window.open("/impressao/teste", "_blank");
      return;
    }

    setTestando(true);
    try {
      const resultado = await provider.imprimir({ html: HTML_TESTE, impressora: nomeImpressora });
      if (!resultado.sucesso) {
        setErro(resultado.motivo ?? "Falha no teste");
        window.open("/impressao/teste", "_blank");
      }
    } finally {
      setTestando(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button type="button" variant="outline" size="sm" onClick={handleTestar} disabled={testando}>
        {testando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : status === "qz-tray" ? <Zap className="h-3.5 w-3.5" /> : <Printer className="h-3.5 w-3.5" />}
        Testar impressão
      </Button>
      {erro && <p className="text-[11px] text-danger">{erro}</p>}
    </div>
  );
}
