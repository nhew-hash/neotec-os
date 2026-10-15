"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { encerrarConversasFinalizadasAction } from "@/services/central-comercial/central-comercial.actions";

/** "Ok", "obrigado"… depois da nossa resposta: mostra quem são e encerra com um clique (com confirmação). */
export function EncerrarFinalizadas({ conversas }: { conversas: { id: string; nome: string }[] }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [msg, setMsg] = useState<{ tom: "ok" | "erro"; texto: string } | null>(null);
  const [pendente, start] = useTransition();
  if (conversas.length === 0) return null;

  function encerrar() {
    setMsg(null);
    start(async () => {
      const r = await encerrarConversasFinalizadasAction(conversas.map((c) => c.id));
      setConfirmando(false);
      if (!r.success) return setMsg({ tom: "erro", texto: r.error });
      setMsg({ tom: "ok", texto: `${r.data.encerradas} ${r.data.encerradas === 1 ? "conversa encerrada" : "conversas encerradas"}.` });
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-border bg-secondary/40 p-3 text-sm">
      <p className="flex items-start gap-2"><CheckCheck className="mt-0.5 h-4 w-4 shrink-0 text-success-text" aria-hidden />
        <span><strong className="tabular-nums">{conversas.length}</strong> {conversas.length === 1 ? "conversa terminou" : "conversas terminaram"} com “ok”, “obrigado” ou 👍 depois da nossa resposta — não {conversas.length === 1 ? "precisa" : "precisam"} de retorno.</span></p>
      <p className="mt-1 truncate pl-6 text-xs text-muted-foreground">
        {conversas.slice(0, 6).map((c, i) => <span key={c.id}>{i > 0 && ", "}<Link href={`/comunicacao/${c.id}`} className="hover:underline">{c.nome}</Link></span>)}{conversas.length > 6 && ` e mais ${conversas.length - 6}`}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2 pl-6">
        {confirmando ? (
          <>
            <Button type="button" size="sm" onClick={encerrar} disabled={pendente}>{pendente ? "Encerrando…" : `Confirmar: encerrar ${conversas.length}`}</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmando(false)} disabled={pendente}>Cancelar</Button>
          </>
        ) : (
          <Button type="button" size="sm" variant="outline" onClick={() => setConfirmando(true)}>Encerrar {conversas.length === 1 ? "esta conversa" : "todas"}</Button>
        )}
        {msg && <span role={msg.tom === "erro" ? "alert" : "status"} className={msg.tom === "erro" ? "text-xs text-danger" : "text-xs text-success-text"}>{msg.texto}</span>}
      </div>
    </div>
  );
}
