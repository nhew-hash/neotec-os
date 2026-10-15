"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCheck, FileText, LayoutGrid, MessagesSquare, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { TrocaNaProposta } from "@/components/central-comercial/troca-na-proposta";
import { CatalogoVenda } from "@/components/central-comercial/catalogo-venda";
import { listarCatalogoAction } from "@/services/central-comercial/central-comercial.actions";
import type { ItemCatalogo } from "@/services/central-comercial/catalogo";
import { formatCurrency } from "@/utils/format";
import { cn } from "@/lib/utils";
import { OBJECOES, PEDIDO_ACOMPANHAMENTO, PERGUNTAS_IPHONE, PERGUNTA_FECHAMENTO, mensagensAcompanhamento } from "@/services/central-comercial/roteiro-venda";

type Aba = "perguntas" | "objecoes" | "fechar";

/**
 * Ajuda durante a conversa (Manual de Vendas): respostas prontas que vão para
 * o campo de mensagem — a vendedora revisa e envia; nada sai sozinho — e
 * atalhos para Atender, Proposta, Troca e Catálogo já com o cliente/conversa.
 * Quando o cliente só respondeu "ok/obrigado" depois da nossa resposta,
 * sugere encerrar a conversa (com um clique, nunca automático).
 */
export function AssistenteConversa({ conversaId, clienteId, nomeCliente, telefone, pareceEncerrada, encerrada, onInserir, onEncerrar, encerrando }: {
  conversaId: string;
  clienteId: string | null;
  telefone: string | null;
  nomeCliente: string;
  pareceEncerrada: boolean;
  encerrada: boolean;
  onInserir: (texto: string) => void;
  onEncerrar: () => void;
  encerrando: boolean;
}) {
  const [aba, setAba] = useState<Aba | null>(null);
  const [dispensou, setDispensou] = useState(false);
  // Catálogo e troca abrem AQUI, por cima da conversa (antes iam para a Central comercial).
  const [catalogoAberto, setCatalogoAberto] = useState(false);
  const [catalogo, setCatalogo] = useState<ItemCatalogo[] | null>(null);
  const [erroCatalogo, setErroCatalogo] = useState<string | null>(null);
  const [trocaAprovada, setTrocaAprovada] = useState<{ modeloNome: string; valor: number } | null>(null);
  useEffect(() => {
    if (!catalogoAberto || catalogo) return;
    listarCatalogoAction().then((r) => (r.success ? setCatalogo(r.data) : setErroCatalogo(r.error)));
  }, [catalogoAberto, catalogo]);
  const primeiroNome = nomeCliente.trim().split(/\s+/)[0] || "";
  const acompanhamento = mensagensAcompanhamento(primeiroNome || "tudo bem", null);

  const respostas: Record<Aba, { rotulo: string; texto: string }[]> = {
    perguntas: PERGUNTAS_IPHONE.map((p) => ({ rotulo: p, texto: p })),
    objecoes: OBJECOES.map((o) => ({ rotulo: `“${o.titulo}”`, texto: o.fala })),
    fechar: [
      { rotulo: "Pergunta de fechamento", texto: PERGUNTA_FECHAMENTO },
      { rotulo: "Cliente vai pensar", texto: PEDIDO_ACOMPANHAMENTO },
      ...acompanhamento.map((m) => ({ rotulo: `Acompanhamento — ${m.rotulo.toLowerCase()}`, texto: m.texto })),
    ],
  };

  const chip = "inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-secondary";

  return (
    <div className="border-b border-border">
      {pareceEncerrada && !encerrada && !dispensou && (
        <div className="flex flex-wrap items-center gap-2 bg-success-soft/60 px-3 py-2 text-xs md:px-4" role="status">
          <CheckCheck className="h-3.5 w-3.5 shrink-0 text-success-text" aria-hidden />
          <span className="flex-1">O cliente só confirmou/agradeceu depois da nossa resposta. Se não há mais nada a fazer, encerre a conversa.</span>
          <Button type="button" size="sm" className="h-7 px-2.5 text-xs" onClick={onEncerrar} disabled={encerrando}>{encerrando ? "Encerrando…" : "Encerrar conversa"}</Button>
          <button type="button" className="text-xs font-medium text-muted-foreground hover:text-foreground" onClick={() => setDispensou(true)}>Ainda tem algo</button>
        </div>
      )}

      <div className="flex items-center gap-1.5 overflow-x-auto px-2 py-2 md:px-3" aria-label="Ajuda na conversa">
        <span className="flex shrink-0 items-center gap-1 pr-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"><Sparkles className="h-3.5 w-3.5" aria-hidden />Ajuda</span>
        {(["perguntas", "objecoes", "fechar"] as Aba[]).map((a) => (
          <button key={a} type="button" aria-expanded={aba === a} onClick={() => setAba(aba === a ? null : a)} className={cn(chip, aba === a && "border-foreground bg-foreground text-background hover:bg-foreground")}>
            {a === "perguntas" ? "Perguntas" : a === "objecoes" ? "Objeções" : "Fechar"}
          </button>
        ))}
        <span className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden />
        {clienteId && <Link href={`/central-comercial/atendimento?cliente=${clienteId}`} className={chip}><MessagesSquare className="h-3.5 w-3.5" aria-hidden />Atender</Link>}
        {clienteId && <Link href={`/central-comercial/proposta?conversa=${conversaId}`} className={chip}><FileText className="h-3.5 w-3.5" aria-hidden />Proposta</Link>}
        {clienteId && (
          <TrocaNaProposta
            cliente={{ id: clienteId, nome: nomeCliente || "Cliente", telefone }}
            textoBotao="Avaliar troca"
            classeBotao={chip}
            onAprovada={(t) => setTrocaAprovada({ modeloNome: t.modeloNome, valor: t.valor })}
          />
        )}
        <button type="button" onClick={() => setCatalogoAberto(true)} className={chip}><LayoutGrid className="h-3.5 w-3.5" aria-hidden />Catálogo</button>
        {!clienteId && <span className="shrink-0 text-[11px] text-muted-foreground">Cadastre o contato para fazer proposta e troca.</span>}
      </div>

      {trocaAprovada && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border bg-success-soft/50 px-3 py-2 text-xs md:px-4" role="status">
          <span className="flex-1">Troca aprovada: {trocaAprovada.modeloNome} — {formatCurrency(trocaAprovada.valor)} (uso interno; na mensagem a proposta fala só da volta).</span>
          <Link href={`/central-comercial/proposta?conversa=${conversaId}`} className="font-medium text-primary hover:underline">Montar proposta com a troca →</Link>
          <button type="button" onClick={() => setTrocaAprovada(null)} aria-label="Fechar aviso" className="text-muted-foreground"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      <Sheet open={catalogoAberto} onOpenChange={setCatalogoAberto}>
        <SheetContent side="right" className="w-full overflow-y-auto p-4 sm:max-w-2xl">
          <SheetTitle className="font-display text-lg">Catálogo — {nomeCliente || "cliente"}</SheetTitle>
          <p className="mb-3 mt-1 text-sm text-muted-foreground">Selecione e coloque na conversa (você revisa antes de enviar) ou monte a proposta.</p>
          {erroCatalogo ? <p role="alert" className="text-sm text-danger">{erroCatalogo}</p>
            : !catalogo ? <p role="status" className="text-sm text-muted-foreground">Carregando o estoque…</p>
            : <CatalogoVenda itens={catalogo} clienteId={clienteId} conversaId={clienteId ? conversaId : null} compacto onInserir={(t) => { onInserir(t); setCatalogoAberto(false); }} />}
        </SheetContent>
      </Sheet>

      {aba && (
        <div className="max-h-56 overflow-y-auto border-t border-border bg-secondary/30 px-2 py-2 md:px-3">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">Toque para colocar no campo de mensagem. Revise antes de enviar.</p>
            <button type="button" onClick={() => setAba(null)} aria-label="Fechar ajuda" className="rounded p-1 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
          </div>
          <ul className="grid gap-1.5 md:grid-cols-2">
            {respostas[aba].map((r) => (
              <li key={r.rotulo}>
                <button type="button" onClick={() => { onInserir(r.texto); setAba(null); }} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-left hover:border-primary/40">
                  <span className="block text-xs font-medium">{r.rotulo}</span>
                  {r.texto !== r.rotulo && <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{r.texto}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
