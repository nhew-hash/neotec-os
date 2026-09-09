"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { salvarModeloContratoAction } from "@/services/contratos/contrato.actions";

interface ModeloAtivo { nome: string; versao: string; conteudo: string; revisado_juridicamente: boolean }

export function NovoModeloForm({ modeloAtivo }: { modeloAtivo: ModeloAtivo | null }) {
  const [aberto, setAberto] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const result = await salvarModeloContratoAction(formData);
      if (!result.success) return setErro(result.error);
      setAberto(false);
    });
  }

  if (!aberto) return <Button type="button" onClick={() => setAberto(true)}>Novo modelo (nova versão)</Button>;

  return (
    <form action={handleSubmit} className="flex flex-col gap-3 rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
      <p className="text-xs text-muted-foreground">
        Usa <code className="rounded bg-secondary px-1">{"{{PLACEHOLDER}}"}</code> pra dado dinâmico, e <code className="rounded bg-secondary px-1">{"{{SE_FIADOR}}...{{FIM_FIADOR}}"}</code> / <code className="rounded bg-secondary px-1">{"{{SE_OPCAO_AQUISICAO}}...{{FIM_OPCAO_AQUISICAO}}"}</code> pra bloco condicional.
      </p>
      <Input name="nome" placeholder="Nome do modelo" defaultValue={modeloAtivo?.nome} />
      <Input name="versao" placeholder="Versão (ex: v1.0)" />
      <Textarea name="conteudo" rows={16} className="font-mono text-xs" defaultValue={modeloAtivo?.conteudo} placeholder="Texto do contrato, com {{PLACEHOLDERS}}..." />
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" name="revisado_juridicamente" className="h-4 w-4 accent-primary" />
        Esse modelo já foi revisado e aprovado por advogado (marca como válido pra produção)
      </label>
      {erro && <p className="text-xs text-danger">{erro}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>{isPending ? "Salvando..." : "Salvar como novo modelo ativo"}</Button>
        <Button type="button" variant="ghost" onClick={() => setAberto(false)}>Cancelar</Button>
      </div>
    </form>
  );
}
