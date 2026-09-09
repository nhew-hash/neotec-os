"use client";

import { useState } from "react";
import { Copy, ExternalLink, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LinkPublicoCard() {
  const [copiado, setCopiado] = useState(false);
  const [link, setLink] = useState("");

  // Só monta a URL no client (evita mismatch de hidratação com origin do servidor).
  if (typeof window !== "undefined" && !link) setLink(`${window.location.origin}/pre-analise`);

  function copiar() {
    navigator.clipboard.writeText(link);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="flex items-center justify-between rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
      <div>
        <p className="text-sm font-medium text-foreground">Link público de pré-análise</p>
        <p className="text-xs text-muted-foreground">Manda pelo WhatsApp/Instagram — o cliente preenche sem precisar de login</p>
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={copiar} className="gap-1.5">
          {copiado ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
          {copiado ? "Copiado!" : "Copiar link"}
        </Button>
        <Button asChild type="button" size="sm" variant="ghost">
          <a href="/pre-analise" target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
        </Button>
      </div>
    </div>
  );
}
