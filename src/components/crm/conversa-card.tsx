"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { moverConversaEtapaAction } from "@/services/crm/crm.actions";
import { formatWhatsapp } from "@/utils";
import type { EtapaFunil, TemperaturaLead } from "@/types";
import type { ConversaComCliente } from "@/services/crm/crm.service";

const ETAPAS: { value: EtapaFunil; label: string }[] = [
  { value: "novo_contato", label: "Novo contato" },
  { value: "em_atendimento", label: "Em atendimento" },
  { value: "produto_enviado", label: "Produto enviado" },
  { value: "orcamento_enviado", label: "Orçamento enviado" },
  { value: "negociacao", label: "Negociação" },
  { value: "aguardando_momento", label: "Aguardando momento" },
  { value: "venda_fechada", label: "Venda fechada" },
  { value: "perdido", label: "Perdido" },
];

const TEMPERATURA_STYLE: Record<TemperaturaLead, { emoji: string; className: string }> = {
  quente: { emoji: "🔥", className: "bg-hot/10 text-hot" },
  morno: { emoji: "🟡", className: "bg-warm/10 text-warm" },
  frio: { emoji: "❄️", className: "bg-cold/10 text-cold" },
};

export function ConversaCard({ conversa }: { conversa: ConversaComCliente }) {
  const [isPending, startTransition] = useTransition();
  const temperatura = TEMPERATURA_STYLE[conversa.temperatura];

  function handleChangeEtapa(novaEtapa: string) {
    startTransition(() => {
      moverConversaEtapaAction(conversa.id, novaEtapa as EtapaFunil);
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-3 shadow-card">
      <div className="flex items-center justify-between">
        <Link href={`/clientes/${conversa.cliente.id}`} className="text-sm font-medium text-foreground hover:underline">
          {conversa.cliente.nome}
        </Link>
        <span className={`rounded-full px-1.5 py-0.5 text-xs ${temperatura.className}`}>
          {temperatura.emoji}
        </span>
      </div>

      <span className="font-mono text-xs text-muted-foreground">
        {formatWhatsapp(conversa.cliente.whatsapp)}
      </span>

      {conversa.produto_interesse && (
        <Badge variant="secondary" className="w-fit">
          {conversa.produto_interesse}
        </Badge>
      )}

      <Select defaultValue={conversa.etapa_funil} onValueChange={handleChangeEtapa} disabled={isPending}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ETAPAS.map((etapa) => (
            <SelectItem key={etapa.value} value={etapa.value}>
              {etapa.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
