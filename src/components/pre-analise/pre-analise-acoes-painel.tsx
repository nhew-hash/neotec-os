"use client";

import { useState, useTransition } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { atualizarStatusPreAnaliseAction, salvarObservacaoPreAnaliseAction } from "@/services/pre-analise/pre-analise.actions";

const STATUS_OPCOES = [
  { value: "novo", label: "Novo" }, { value: "em_analise", label: "Em análise" }, { value: "contatar_cliente", label: "Contatar cliente" },
  { value: "aguardando_documentos", label: "Aguardando documentos" }, { value: "aprovado", label: "Aprovado" },
  { value: "reprovado", label: "Reprovado" }, { value: "venda_fechada", label: "Venda fechada" }, { value: "perdido", label: "Perdido" },
];

export function PreAnaliseAcoesPainel({ id, status, observacoesAtuais, whatsappLink }: { id: string; status: string; observacoesAtuais: string | null; whatsappLink: string }) {
  const [isPending, startTransition] = useTransition();
  const [observacoes, setObservacoes] = useState(observacoesAtuais ?? "");
  const [salvo, setSalvo] = useState(false);

  function handleStatus(novoStatus: string) {
    startTransition(() => { void atualizarStatusPreAnaliseAction(id, novoStatus); });
  }

  function handleSalvarObservacao() {
    setSalvo(false);
    startTransition(async () => {
      await salvarObservacaoPreAnaliseAction(id, observacoes);
      setSalvo(true);
    });
  }

  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button asChild className="gap-1.5">
          <a href={whatsappLink} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" />Conversar no WhatsApp</a>
        </Button>
        <Select value={status} onValueChange={handleStatus} disabled={isPending}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>{STATUS_OPCOES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <label className="text-xs font-medium text-muted-foreground">Observações internas</label>
      <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} className="mt-1" rows={3} />
      <div className="mt-2 flex items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={handleSalvarObservacao} disabled={isPending}>Salvar observação</Button>
        {salvo && <span className="text-xs text-success-text">Salvo.</span>}
      </div>
    </div>
  );
}
