"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { decidirAprovacaoDescontoAction } from "@/services/vendas/aprovacoes-desconto.actions";
import type { AprovacaoDesconto } from "@/services/vendas/aprovacoes-desconto.service";
import { formatCurrency, formatDateTime } from "@/utils/format";

function Linha({ a }: { a: AprovacaoDesconto }) {
  const router = useRouter();
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, start] = useTransition();
  function decidir(aprovar: boolean) {
    setErro(null);
    start(async () => { const r = await decidirAprovacaoDescontoAction(a.id, aprovar, motivo); if (!r.success) setErro(r.error); else router.refresh(); });
  }
  return (
    <li className="flex flex-col gap-2 py-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
        <span className="font-medium">{a.solicitante_nome ?? "Vendedor"}</span>
        <span className="tabular-nums">desconto de {formatCurrency(a.valor_desconto)} ({a.percentual}%) sobre {formatCurrency(a.valor_bruto)}</span>
        <span className="text-xs text-muted-foreground">{formatDateTime(a.criado_em)}</span>
      </div>
      {a.motivo && <p className="text-sm text-muted-foreground">Motivo informado: {a.motivo}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <Input className="max-w-xs" placeholder="Observação (obrigatória se recusar)" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        <Button size="sm" disabled={pendente} onClick={() => decidir(true)}>Aprovar</Button>
        <Button size="sm" variant="outline" disabled={pendente || !motivo.trim()} onClick={() => decidir(false)}>Recusar</Button>
      </div>
      {erro && <p role="alert" className="text-sm text-danger">{erro}</p>}
    </li>
  );
}

export function AprovacoesGerente({ aprovacoes }: { aprovacoes: AprovacaoDesconto[] }) {
  if (aprovacoes.length === 0) return <Card className="p-4 text-sm text-muted-foreground">Nenhum desconto esperando aprovação.</Card>;
  return <Card className="px-4"><ul className="divide-y divide-border">{aprovacoes.map((a) => <Linha key={a.id} a={a} />)}</ul></Card>;
}
