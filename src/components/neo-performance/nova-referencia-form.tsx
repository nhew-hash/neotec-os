"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { criarReferenciaAction, analisarDnaAction } from "@/services/neo-performance/neo-performance-avancado.actions";

export function NovaReferenciaForm() {
  const [isPending, startTransition] = useTransition();
  const [origem, setOrigem] = useState("");
  const [url, setUrl] = useState("");
  const [mensagem, setMensagem] = useState<string | null>(null);

  function handleCriar() {
    if (!origem.trim()) return;
    setMensagem(null);
    startTransition(async () => {
      const criado = await criarReferenciaAction({ origem: origem.trim(), url_origem: url.trim() || undefined });
      if (!criado.success) { setMensagem(criado.error); return; }
      setOrigem("");
      setUrl("");
      setMensagem("Referência criada.");
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Origem</span>
          <Input className="h-9 w-48" value={origem} onChange={(e) => setOrigem(e.target.value)} placeholder="meta_ad_library, interno..." />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Link (opcional)</span>
          <Input className="h-9 w-64" value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
        <Button size="sm" onClick={handleCriar} disabled={isPending || !origem.trim()}>Criar referência</Button>
      </div>
      {mensagem && <p className="text-xs text-muted-foreground">{mensagem}</p>}

      <div className="border-t border-border pt-3">
        <p className="mb-2 text-xs text-muted-foreground">
          Pra extrair o DNA de uma referência já criada, descreva o criativo abaixo (nunca cole o anúncio de terceiro inteiro — descreva o que viu)
          e peça pelo ID dela na lista acima.
        </p>
        <AnalisarDnaForm />
      </div>
    </div>
  );
}

function AnalisarDnaForm() {
  const [isPending, startTransition] = useTransition();
  const [referenciaId, setReferenciaId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [mensagem, setMensagem] = useState<string | null>(null);

  function handleAnalisar() {
    if (!referenciaId.trim() || !descricao.trim()) return;
    setMensagem(null);
    startTransition(async () => {
      const resultado = await analisarDnaAction(referenciaId.trim(), descricao.trim());
      setMensagem(resultado.success ? "DNA extraído e salvo." : resultado.error);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Input className="h-9 w-80" value={referenciaId} onChange={(e) => setReferenciaId(e.target.value)} placeholder="ID da referência" />
      <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descreva o criativo: hook, formato, CTA, oferta, estilo..." rows={3} />
      <Button size="sm" variant="outline" onClick={handleAnalisar} disabled={isPending || !referenciaId.trim() || !descricao.trim()} className="w-fit">
        {isPending ? "Analisando..." : "Extrair DNA com IA"}
      </Button>
      {mensagem && <p className="text-xs text-muted-foreground">{mensagem}</p>}
    </div>
  );
}
