"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { atualizarStatusLeadProstecAction, registrarVendaProstecAction } from "@/services/prostec/prostec.actions";
import type { ProstecLead } from "@/services/prostec/prostec.service";

const STATUS_DISPONIVEIS = ["novo", "contato_realizado", "qualificado", "reuniao", "proposta_enviada", "negociacao", "venda_fechada", "perdido"];
const STATUS_LABELS: Record<string, string> = {
  novo: "Novo", contato_realizado: "Contatado", qualificado: "Qualificado", reuniao: "Reunião",
  proposta_enviada: "Proposta enviada", negociacao: "Negociação", venda_fechada: "Fechado", perdido: "Perdido",
};
const COR_TEMPERATURA: Record<string, string> = { quente: "text-danger bg-danger/10", morno: "text-warning bg-warning/10", frio: "text-muted-foreground bg-secondary" };

export function LeadsProstecTable({ leads }: { leads: ProstecLead[] }) {
  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-foreground">Leads (ordenados por oportunidade)</h2>

      {leads.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Nenhum lead ainda — a busca de novas empresas ainda precisa ser configurada.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {leads.map((lead) => <LinhaLead key={lead.id} lead={lead} />)}
        </div>
      )}
    </div>
  );
}

function LinhaLead({ lead }: { lead: ProstecLead }) {
  const [status, setStatus] = useState(lead.status);
  const [mostrarVenda, setMostrarVenda] = useState(false);
  const [produto, setProduto] = useState("Site institucional");
  const [valor, setValor] = useState("1497");
  const [comissaoPct, setComissaoPct] = useState("10");
  const [salvando, setSalvando] = useState(false);

  async function handleMudarStatus(novoStatus: string) {
    if (novoStatus === "perdido") {
      const motivo = window.prompt("Por que esse lead foi perdido? (Preço, Sem interesse, Já possui fornecedor, Já possui site, Não respondeu, Momento inadequado, Concorrente, Outro)");
      if (!motivo?.trim()) return; // sem motivo, não marca como perdido — pedido explícito, precisa saber o porquê
      setStatus(novoStatus);
      await atualizarStatusLeadProstecAction(lead.id, novoStatus, motivo.trim());
      return;
    }
    setStatus(novoStatus);
    await atualizarStatusLeadProstecAction(lead.id, novoStatus);
  }

  async function handleRegistrarVenda() {
    setSalvando(true);
    await registrarVendaProstecAction(lead.id, produto, Number(valor), Number(comissaoPct));
    setSalvando(false);
    setMostrarVenda(false);
    setStatus("venda_fechada");
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-black/[0.04] bg-secondary/30 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", COR_TEMPERATURA[lead.temperature])}>{lead.temperature}</span>
          <span className="text-xs font-semibold text-muted-foreground">{lead.score} pts</span>
        </div>
        <span className="text-xs text-muted-foreground">{lead.segment}</span>
      </div>

      <div>
        <Link href={`/prostec/leads/${lead.id}`} className="text-sm font-medium text-foreground hover:text-primary hover:underline">{lead.company?.name ?? "—"}</Link>
        <p className="text-xs text-muted-foreground">{lead.company?.city}, {lead.company?.state} {lead.company?.whatsapp && `· ${lead.company.whatsapp}`}</p>
      </div>

      {lead.approach_suggestion && <p className="text-xs italic text-muted-foreground">💡 {lead.approach_suggestion}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <Select value={status} onValueChange={handleMudarStatus}>
          <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUS_DISPONIVEIS.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>

        {status !== "venda_fechada" && (
          <Button type="button" size="sm" variant="outline" onClick={() => setMostrarVenda((v) => !v)}>
            {mostrarVenda ? "Cancelar" : "Registrar venda"}
          </Button>
        )}
      </div>

      {mostrarVenda && (
        <div className="grid grid-cols-3 gap-2 rounded-lg border border-border bg-white p-2">
          <Input placeholder="Produto" value={produto} onChange={(e) => setProduto(e.target.value)} className="h-8 text-xs" />
          <Input type="number" placeholder="Valor" value={valor} onChange={(e) => setValor(e.target.value)} className="h-8 text-xs" />
          <Input type="number" placeholder="Comissão %" value={comissaoPct} onChange={(e) => setComissaoPct(e.target.value)} className="h-8 text-xs" />
          <Button type="button" size="sm" onClick={handleRegistrarVenda} disabled={salvando} className="col-span-3">
            {salvando ? "Salvando..." : "Confirmar venda"}
          </Button>
        </div>
      )}
    </div>
  );
}
