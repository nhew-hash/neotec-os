"use client";

import { useState, useTransition } from "react";
import { Check, Copy, MessageCircleQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { agendarAcompanhamentoAction } from "@/services/central-comercial/central-comercial.actions";
import { OBJECOES, PEDIDO_ACOMPANHAMENTO, PERGUNTA_FECHAMENTO, mensagensAcompanhamento } from "@/services/central-comercial/roteiro-venda";

/**
 * Negociar e fechar, do Manual de Vendas: as 10 objeções com a fala certa, a
 * pergunta de fechamento e, se o cliente for pensar, o acompanhamento — só com
 * autorização dele, e só como lembrete para a vendedora (nada é enviado sozinho).
 */
export function RoteiroFechamento({ cliente, vendedora, naoContatar }: { cliente: { id: string; nome: string } | null; vendedora: string | null; naoContatar: boolean }) {
  const [aberta, setAberta] = useState<number | null>(null);
  const [autorizou, setAutorizou] = useState(false);
  const [resultado, setResultado] = useState<{ tom: "ok" | "erro"; texto: string } | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [pendente, start] = useTransition();
  const mensagens = cliente ? mensagensAcompanhamento(cliente.nome, vendedora) : [];

  function agendar() {
    if (!cliente) return;
    setResultado(null);
    start(async () => {
      const r = await agendarAcompanhamentoAction({ clienteId: cliente.id, autorizado: autorizou });
      if (!r.success) return setResultado({ tom: "erro", texto: r.error });
      setResultado({ tom: "ok", texto: r.data.criados > 0 ? "Acompanhamento agendado: hoje e em 24h aparecem nos seus Retornos do CRM." : "Este cliente já tem acompanhamento pendente. Nada foi duplicado." });
    });
  }

  async function copiar(id: string, texto: string) {
    try { await navigator.clipboard.writeText(texto); setCopiado(id); setTimeout(() => setCopiado(null), 2000); }
    catch { setResultado({ tom: "erro", texto: "Não consegui copiar. Selecione o texto e copie manualmente." }); }
  }

  return (
    <Card className="space-y-4 p-5">
      <div>
        <p className="font-display text-base font-semibold">Negociar e fechar</p>
        <p className="text-xs text-muted-foreground">Do Manual de Vendas. Descubra a objeção real antes de oferecer desconto.</p>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Objeções</p>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {OBJECOES.map((o, i) => (
            <li key={o.titulo}>
              <button type="button" onClick={() => setAberta(aberta === i ? null : i)} aria-expanded={aberta === i} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-secondary/50">
                <MessageCircleQuestion className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />“{o.titulo}”
              </button>
              {aberta === i && <p className="px-3 pb-3 text-sm text-foreground">Diga: <span className="italic">“{o.fala}”</span></p>}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg bg-accent p-3 text-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent-foreground/70">A pergunta que não pode faltar</p>
        <p className="mt-1 italic">“{PERGUNTA_FECHAMENTO}”</p>
      </div>

      {cliente && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cliente vai pensar?</p>
          <p className="text-sm italic text-muted-foreground">“{PEDIDO_ACOMPANHAMENTO}”</p>
          {naoContatar ? (
            <p className="text-sm text-danger">Este cliente pediu para não ser contatado. Agradeça e respeite a decisão.</p>
          ) : (
            <>
              <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 h-4 w-4" checked={autorizou} onChange={(e) => setAutorizou(e.target.checked)} /><span>O cliente autorizou o contato pelo WhatsApp</span></label>
              <Button type="button" variant="outline" size="sm" onClick={agendar} disabled={!autorizou || pendente}>{pendente ? "Agendando…" : "Agendar acompanhamento (hoje e em 24h)"}</Button>
              <details className="text-sm">
                <summary className="cursor-pointer text-xs font-medium text-primary">Ver as mensagens de acompanhamento</summary>
                <ul className="mt-2 space-y-2">
                  {mensagens.map((m) => (
                    <li key={m.momento} className="rounded-md bg-secondary/50 p-2">
                      <div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-muted-foreground">{m.rotulo}</span>
                        <button type="button" onClick={() => copiar(m.momento, m.texto)} className="inline-flex items-center gap-1 text-xs font-medium text-primary">{copiado === m.momento ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}{copiado === m.momento ? "Copiado" : "Copiar"}</button></div>
                      <p className="mt-1">{m.texto}</p>
                    </li>
                  ))}
                </ul>
              </details>
            </>
          )}
          {resultado && <p role={resultado.tom === "erro" ? "alert" : "status"} className={resultado.tom === "erro" ? "text-sm text-danger" : "text-sm text-success-text"}>{resultado.texto}</p>}
        </div>
      )}
    </Card>
  );
}
