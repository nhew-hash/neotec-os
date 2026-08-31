"use client";

import { useState, useTransition } from "react";
import { Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { criarPropostaProstecAction } from "@/services/prostec/prostec.actions";
import { formatCurrency, formatDateTime } from "@/utils";
import type { ProstecProposta } from "@/services/prostec/prostec.service";

const LABEL_STATUS: Record<string, string> = { enviada: "Enviada", visualizada: "Visualizada", aceita: "Aceita ✅", recusada: "Recusada ❌" };

export function PropostaLeadPanel({ leadId, propostas: propostasIniciais }: { leadId: string; propostas: ProstecProposta[] }) {
  const [propostas, setPropostas] = useState(propostasIniciais);
  const [aberto, setAberto] = useState(false);
  const [produto, setProduto] = useState("Site institucional");
  const [valor, setValor] = useState("1497");
  const [formaPagamento, setFormaPagamento] = useState("PIX ou cartão");
  const [isPending, startTransition] = useTransition();
  const [linkGerado, setLinkGerado] = useState<string | null>(null);

  function handleCriar() {
    startTransition(async () => {
      const result = await criarPropostaProstecAction(leadId, produto, Number(valor), formaPagamento);
      if (result.success) {
        const link = `${window.location.origin}/proposta/${result.data.token}`;
        setLinkGerado(link);
        setAberto(false);
      }
    });
  }

  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Propostas</h2>
        {!aberto && <Button type="button" size="sm" variant="outline" onClick={() => setAberto(true)}>Nova proposta</Button>}
      </div>

      {aberto && (
        <div className="mb-3 flex flex-col gap-2 rounded-xl border border-border p-3">
          <Input placeholder="Produto" value={produto} onChange={(e) => setProduto(e.target.value)} className="h-8 text-xs" />
          <Input type="number" placeholder="Valor" value={valor} onChange={(e) => setValor(e.target.value)} className="h-8 text-xs" />
          <Input placeholder="Forma de pagamento" value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)} className="h-8 text-xs" />
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={handleCriar} disabled={isPending}>{isPending ? "Gerando..." : "Gerar proposta"}</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setAberto(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      {linkGerado && (
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-success/10 p-2.5 text-xs">
          <span className="flex-1 truncate text-success-text">{linkGerado}</span>
          <button type="button" onClick={() => navigator.clipboard.writeText(linkGerado)} className="text-success-text hover:underline"><Copy className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {propostas.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma proposta enviada ainda.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {propostas.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-xl bg-secondary/40 p-2.5 text-xs">
              <div>
                <p className="font-medium text-foreground">{p.produto} — {formatCurrency(p.valor)}</p>
                <p className="text-muted-foreground">{LABEL_STATUS[p.status]} · {p.visualizacoes} visualização{p.visualizacoes !== 1 ? "ões" : ""} · {formatDateTime(p.created_at)}</p>
              </div>
              <a href={`/proposta/${p.token_publico}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline"><ExternalLink className="h-3.5 w-3.5" /></a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
