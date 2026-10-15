"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Hourglass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { encerrarConversasFinalizadasAction, gerarRetornoConversaAction } from "@/services/central-comercial/central-comercial.actions";
import { formatDateTime } from "@/utils/format";

/** Sem resposta há mais de 4 dias: não fica na fila — vira retorno (acompanhamento real) ou é encerrada. */
export function ConversasParadas({ conversas }: { conversas: { id: string; nome: string; em: string | null }[] }) {
  const router = useRouter();
  const [feitas, setFeitas] = useState<Set<string>>(new Set());
  const [confirmando, setConfirmando] = useState(false);
  const [msg, setMsg] = useState<{ tom: "ok" | "erro"; texto: string } | null>(null);
  const [pendente, start] = useTransition();
  const visiveis = conversas.filter((c) => !feitas.has(c.id));
  if (visiveis.length === 0) return null;

  const marcar = (id: string) => setFeitas((s) => new Set(s).add(id));
  function retorno(id: string) {
    setMsg(null);
    start(async () => {
      const r = await gerarRetornoConversaAction(id);
      if (!r.success) return setMsg({ tom: "erro", texto: r.error });
      marcar(id);
      setMsg({ tom: "ok", texto: r.data.jaExistia ? "Esse cliente já tinha retorno pendente; a conversa saiu da fila." : "Retorno criado para hoje (aparece em Retornos do CRM)." });
      router.refresh();
    });
  }
  function encerrar(ids: string[]) {
    setMsg(null);
    start(async () => {
      const r = await encerrarConversasFinalizadasAction(ids, "paradas");
      setConfirmando(false);
      if (!r.success) return setMsg({ tom: "erro", texto: r.error });
      ids.forEach(marcar);
      setMsg({ tom: "ok", texto: `${r.data.encerradas} ${r.data.encerradas === 1 ? "conversa encerrada" : "conversas encerradas"}.` });
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-warning/30 bg-warning-soft/40 p-3 text-sm">
      <p className="flex items-start gap-2"><Hourglass className="mt-0.5 h-4 w-4 shrink-0 text-warning-text" aria-hidden />
        <span><strong className="tabular-nums">{visiveis.length}</strong> {visiveis.length === 1 ? "conversa está parada" : "conversas estão paradas"} há mais de 4 dias sem resposta. Gere um retorno para quem vale a pena ou encerre.</span></p>
      <ul className="mt-2 divide-y divide-border/60 pl-6">
        {visiveis.slice(0, 8).map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-2 py-1.5">
            <Link href={`/comunicacao/${c.id}`} className="min-w-0 flex-1 truncate font-medium hover:underline">{c.nome}</Link>
            {c.em && <span className="text-xs text-muted-foreground">{formatDateTime(c.em)}</span>}
            <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => retorno(c.id)} disabled={pendente}>Gerar retorno</Button>
            <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => encerrar([c.id])} disabled={pendente}>Encerrar</Button>
          </li>
        ))}
      </ul>
      {visiveis.length > 8 && <p className="pl-6 text-xs text-muted-foreground">e mais {visiveis.length - 8}.</p>}
      <div className="mt-2 flex flex-wrap items-center gap-2 pl-6">
        {confirmando ? (
          <>
            <Button type="button" size="sm" onClick={() => encerrar(visiveis.map((c) => c.id))} disabled={pendente}>{pendente ? "Encerrando…" : `Confirmar: encerrar ${visiveis.length}`}</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmando(false)} disabled={pendente}>Cancelar</Button>
          </>
        ) : visiveis.length > 1 && <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmando(true)}>Encerrar todas</Button>}
        {msg && <span role={msg.tom === "erro" ? "alert" : "status"} className={msg.tom === "erro" ? "text-xs text-danger" : "text-xs text-success-text"}>{msg.texto}</span>}
      </div>
    </div>
  );
}
