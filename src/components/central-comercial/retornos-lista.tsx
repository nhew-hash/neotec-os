"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { concluirFollowupAction } from "@/services/crm-pipeline/crm-pipeline.actions";
import { formatDateTime } from "@/utils/format";
import { cn } from "@/lib/utils";
import type { RetornoDoDia } from "@/services/central-comercial/central-comercial.service";

/** Retornos do CRM de hoje/atrasados na rotina — concluir aqui é o mesmo follow-up do CRM (uma fonte só). */
export function RetornosLista({ retornos }: { retornos: RetornoDoDia[] }) {
  const router = useRouter();
  const [pendente, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [feitos, setFeitos] = useState<string[]>([]);
  const visiveis = retornos.filter((r) => !feitos.includes(r.id));

  function concluir(id: string) {
    setErro(null);
    start(async () => {
      const r = await concluirFollowupAction(id);
      if (!r.success) return setErro(r.error);
      setFeitos((f) => [...f, id]);
      router.refresh();
    });
  }

  if (visiveis.length === 0) return <Card className="p-4 text-sm text-muted-foreground">Nenhum retorno para hoje. <Link href="/crm?aba=followups" className="font-medium text-primary hover:underline">Ver agenda do CRM</Link></Card>;

  return (
    <Card className="px-4">
      {erro && <p className="pt-3 text-xs text-danger" role="alert">{erro}</p>}
      <ul className="divide-y divide-border">
        {visiveis.slice(0, 8).map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{r.cliente_nome ?? "Cliente"}</p>
              <p className="truncate text-xs text-muted-foreground">
                {r.motivo} · <span className={cn("tabular-nums", r.atrasado && "font-medium text-danger")}>{r.atrasado ? "atrasado desde " : ""}{formatDateTime(r.data_agendada)}</span>
              </p>
            </div>
            {r.conversa_id ? (
              <Link href={`/comunicacao/${r.conversa_id}`} className={buttonVariants({ variant: "outline", size: "sm" })}><MessageCircle aria-hidden />Conversa</Link>
            ) : r.cliente_id ? (
              <Link href={`/clientes/${r.cliente_id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>Cliente</Link>
            ) : null}
            <Button variant="ghost" size="sm" onClick={() => concluir(r.id)} disabled={pendente} aria-label={`Marcar retorno de ${r.cliente_nome ?? "cliente"} como feito`}><Check aria-hidden />Feito</Button>
          </li>
        ))}
      </ul>
      {visiveis.length > 8 && <Link href="/crm?aba=followups" className="block border-t border-border py-3 text-center text-sm font-medium text-primary">Ver todos os {visiveis.length} retornos</Link>}
    </Card>
  );
}
