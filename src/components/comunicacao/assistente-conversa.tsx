"use client";

import { memo, useEffect, useState } from "react";
import { CheckCheck, FileText, ImageIcon, Kanban, LayoutGrid, MessageCircleQuestion, MessagesSquare, Repeat, ShieldQuestion, Target, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { TrocaNaProposta } from "@/components/central-comercial/troca-na-proposta";
import { CatalogoVenda } from "@/components/central-comercial/catalogo-venda";
import { AtendimentoGuiado } from "@/components/central-comercial/atendimento-guiado";
import { PropostaForm } from "@/components/central-comercial/proposta-form";
import { AcoesRapidas } from "./acoes-rapidas";
import { dadosAtendimentoAction, listarCatalogoAction, prepararPropostaNaConversaAction, type PropostaNaConversa } from "@/services/central-comercial/central-comercial.actions";
import type { ItemCatalogo } from "@/services/central-comercial/catalogo";
import type { ClienteResultado } from "@/services/central-comercial/clientes-busca.service";
import { formatCurrency } from "@/utils/format";
import { cn } from "@/lib/utils";
import { OBJECOES, PEDIDO_ACOMPANHAMENTO, PERGUNTAS_IPHONE, PERGUNTA_FECHAMENTO, mensagensAcompanhamento } from "@/services/central-comercial/roteiro-venda";

type Aba = "perguntas" | "objecoes" | "fechar";
type Folha = "atender" | "proposta" | "catalogo" | "crm" | null;

const ROTULO_ABA: Record<Aba, string> = { perguntas: "Perguntas", objecoes: "Objeções", fechar: "Fechamento" };

/**
 * Ferramentas da conversa, em dois grupos:
 * - Vender: Atender (roteiro), Proposta, Avaliar troca e Catálogo — tudo abre
 *   POR CIMA da conversa, sem sair dela;
 * - Responder: textos prontos do Manual de Vendas que vão para o campo de
 *   mensagem (a vendedora revisa e envia; nada sai sozinho).
 * No computador ficam numa linha acima do campo; no celular, no botão "+"
 * do campo (como o anexo do WhatsApp), para sobrar tela para as mensagens.
 * Quando o cliente só respondeu "ok/obrigado" depois da nossa resposta,
 * sugere encerrar (com um clique, nunca automático).
 */
export const AssistenteConversa = memo(function AssistenteConversa({ conversaId, clienteId, cardId, nomeCliente, telefone, pareceEncerrada, encerrada, onInserir, onEncerrar, encerrando, menuAberto, onMenuAberto, onFotoCatalogo, onAbrirCliente }: {
  cardId: string | null;
  conversaId: string;
  clienteId: string | null;
  telefone: string | null;
  nomeCliente: string;
  pareceEncerrada: boolean;
  encerrada: boolean;
  onInserir: (texto: string) => void;
  onEncerrar: () => void;
  encerrando: boolean;
  /** Menu "+" do celular. */
  menuAberto: boolean;
  onMenuAberto: (v: boolean) => void;
  onFotoCatalogo: () => void;
  onAbrirCliente: () => void;
}) {
  const [aba, setAba] = useState<Aba | null>(null);
  const [dispensou, setDispensou] = useState(false);
  const [folha, setFolha] = useState<Folha>(null);
  const [trocaAberta, setTrocaAberta] = useState(false);
  const [trocaAprovada, setTrocaAprovada] = useState<{ modeloNome: string; valor: number } | null>(null);

  // Catálogo (também usado pelo Atender).
  const [catalogo, setCatalogo] = useState<ItemCatalogo[] | null>(null);
  const [erroCatalogo, setErroCatalogo] = useState<string | null>(null);
  useEffect(() => {
    if (folha !== "catalogo" || catalogo) return;
    listarCatalogoAction().then((r) => (r.success ? setCatalogo(r.data) : setErroCatalogo(r.error)));
  }, [folha, catalogo]);

  // Atender: estoque + cliente.
  const [atendimento, setAtendimento] = useState<{ itens: ItemCatalogo[]; cliente: ClienteResultado | null } | null>(null);
  const [erroAtendimento, setErroAtendimento] = useState<string | null>(null);
  useEffect(() => {
    if (folha !== "atender" || atendimento) return;
    dadosAtendimentoAction(clienteId).then((r) => (r.success ? setAtendimento(r.data) : setErroAtendimento(r.error)));
  }, [folha, atendimento, clienteId]);

  // Proposta: montada no servidor com a mesma regra da tela de proposta.
  const [proposta, setProposta] = useState<(PropostaNaConversa & { abrirTroca: boolean; chave: string }) | null>(null);
  const [erroProposta, setErroProposta] = useState<string | null>(null);
  function abrirProposta(extra?: { itens: string; nota: string; troca: boolean }) {
    setProposta(null); setErroProposta(null); setFolha("proposta");
    prepararPropostaNaConversaAction({ conversaId, itens: extra?.itens || undefined, nota: extra?.nota || undefined })
      .then((r) => (r.success ? setProposta({ ...r.data, abrirTroca: !!extra?.troca, chave: `${Date.now()}` }) : setErroProposta(r.error)));
  }

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

  const semCadastro = !clienteId;
  const chip = "inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-secondary disabled:pointer-events-none disabled:opacity-40";
  const vender: { id: string; rotulo: string; icone: typeof FileText; acao: () => void; precisaCadastro: boolean }[] = [
    { id: "atender", rotulo: "Atender", icone: MessagesSquare, acao: () => setFolha("atender"), precisaCadastro: false },
    { id: "proposta", rotulo: "Proposta", icone: FileText, acao: () => abrirProposta(), precisaCadastro: true },
    { id: "troca", rotulo: "Avaliar troca", icone: Repeat, acao: () => setTrocaAberta(true), precisaCadastro: true },
    { id: "catalogo", rotulo: "Catálogo", icone: LayoutGrid, acao: () => setFolha("catalogo"), precisaCadastro: false },
    { id: "crm", rotulo: "CRM", icone: Kanban, acao: () => setFolha("crm"), precisaCadastro: false },
  ];

  function escolherNoMenu(fn: () => void) {
    onMenuAberto(false);
    // Deixa o menu fechar antes de abrir a próxima janela (evita duas camadas de foco no celular).
    setTimeout(fn, 120);
  }

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

      {/* Computador: uma linha — Vender | Responder */}
      <div className="hidden items-center gap-1.5 overflow-x-auto px-3 py-2 neotec-scroll-x md:flex" aria-label="Ferramentas da conversa">
        {vender.map((v) => (
          <button key={v.id} type="button" onClick={v.acao} disabled={v.precisaCadastro && semCadastro} title={v.precisaCadastro && semCadastro ? "Cadastre o contato para usar" : undefined} className={chip}>
            <v.icone className="h-3.5 w-3.5" aria-hidden />{v.rotulo}
          </button>
        ))}
        <span className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden />
        <span className="shrink-0 pr-0.5 text-[11px] font-medium text-muted-foreground">Responder</span>
        {(Object.keys(ROTULO_ABA) as Aba[]).map((a) => (
          <button key={a} type="button" aria-expanded={aba === a} onClick={() => setAba(aba === a ? null : a)} className={cn(chip, aba === a && "border-foreground bg-foreground text-background hover:bg-foreground")}>
            {ROTULO_ABA[a]}
          </button>
        ))}
        {semCadastro && <span className="shrink-0 pl-1 text-[11px] text-muted-foreground">Cadastre o contato para fazer proposta e troca.</span>}
      </div>

      {trocaAprovada && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border bg-success-soft/50 px-3 py-2 text-xs md:px-4" role="status">
          <span className="flex-1">Troca aprovada: {trocaAprovada.modeloNome} — {formatCurrency(trocaAprovada.valor)} (uso interno; na mensagem a proposta fala só da volta).</span>
          <button type="button" onClick={() => abrirProposta()} className="font-medium text-primary hover:underline">Montar proposta com a troca →</button>
          <button type="button" onClick={() => setTrocaAprovada(null)} aria-label="Fechar aviso" className="text-muted-foreground"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {aba && (
        <div className="max-h-56 overflow-y-auto border-t border-border bg-secondary/30 px-2 py-2 md:px-3">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">Toque para colocar no campo de mensagem. Revise antes de enviar.</p>
            <button type="button" onClick={() => setAba(null)} aria-label="Fechar respostas" className="rounded p-1 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
          </div>
          <ListaRespostas itens={respostas[aba]} onEscolher={(t) => { onInserir(t); setAba(null); }} />
        </div>
      )}

      {/* Celular: menu do "+" */}
      <Sheet open={menuAberto} onOpenChange={onMenuAberto}>
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-2xl p-4">
          <SheetTitle className="sr-only">Ferramentas da conversa</SheetTitle>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Vender</p>
          <div className="grid grid-cols-4 gap-2">
            {vender.map((v) => (
              <BotaoMenu key={v.id} icone={v.icone} rotulo={v.rotulo} desativado={v.precisaCadastro && semCadastro} onClick={() => escolherNoMenu(v.acao)} />
            ))}
            <BotaoMenu icone={ImageIcon} rotulo="Foto do estoque" onClick={() => escolherNoMenu(onFotoCatalogo)} />
            <BotaoMenu icone={UserRound} rotulo="Cliente" onClick={() => escolherNoMenu(onAbrirCliente)} />
          </div>
          {semCadastro && <p className="mt-2 text-xs text-muted-foreground">Cadastre o contato para fazer proposta e troca.</p>}
          <p className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Responder</p>
          <div className="grid grid-cols-3 gap-2">
            <BotaoMenu icone={MessageCircleQuestion} rotulo="Perguntas" onClick={() => escolherNoMenu(() => setAba("perguntas"))} />
            <BotaoMenu icone={ShieldQuestion} rotulo="Objeções" onClick={() => escolherNoMenu(() => setAba("objecoes"))} />
            <BotaoMenu icone={Target} rotulo="Fechamento" onClick={() => escolherNoMenu(() => setAba("fechar"))} />
          </div>
        </SheetContent>
      </Sheet>

      {clienteId && (
        <TrocaNaProposta
          cliente={{ id: clienteId, nome: nomeCliente || "Cliente", telefone }}
          controle={{ aberto: trocaAberta, onChange: setTrocaAberta }}
          onAprovada={(t) => setTrocaAprovada({ modeloNome: t.modeloNome, valor: t.valor })}
        />
      )}

      <Sheet open={folha !== null} onOpenChange={(v) => !v && setFolha(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto p-4 sm:max-w-3xl">
          {folha === "crm" && (
            <>
              <SheetTitle className="font-display text-lg">Ações rápidas — {nomeCliente || "contato"}</SheetTitle>
              <p className="mb-4 mt-1 text-sm text-muted-foreground">Criar OS ou orçamento, anotar no CRM e mudar a etapa sem sair da conversa.</p>
              <AcoesRapidas clienteId={clienteId} cardId={cardId} sempreAberto />
            </>
          )}
          {folha === "catalogo" && (
            <>
              <SheetTitle className="font-display text-lg">Catálogo — {nomeCliente || "cliente"}</SheetTitle>
              <p className="mb-3 mt-1 text-sm text-muted-foreground">Selecione e coloque na conversa (você revisa antes de enviar) ou monte a proposta.</p>
              {erroCatalogo ? <p role="alert" className="text-sm text-danger">{erroCatalogo}</p>
                : !catalogo ? <p role="status" className="text-sm text-muted-foreground">Carregando o estoque…</p>
                : <CatalogoVenda itens={catalogo} clienteId={clienteId} conversaId={clienteId ? conversaId : null} compacto onInserir={(t) => { onInserir(t); setFolha(null); }} />}
            </>
          )}
          {folha === "atender" && (
            <>
              <SheetTitle className="font-display text-lg">Atender — {nomeCliente || "cliente"}</SheetTitle>
              <p className="mb-4 mt-1 text-sm text-muted-foreground">Entender → indicar → negociar → fechar. Ao montar a proposta, ela abre aqui mesmo.</p>
              {erroAtendimento ? <p role="alert" className="text-sm text-danger">{erroAtendimento}</p>
                : !atendimento ? <p role="status" className="text-sm text-muted-foreground">Carregando o estoque…</p>
                : <AtendimentoGuiado itens={atendimento.itens} clienteInicial={atendimento.cliente} onMontarProposta={(p) => abrirProposta(p)} />}
            </>
          )}
          {folha === "proposta" && (
            <>
              <SheetTitle className="font-display text-lg">Proposta — {nomeCliente || "cliente"}</SheetTitle>
              <p className="mb-4 mt-1 text-sm text-muted-foreground">Valores pelo mesmo motor de preços da loja. O envio pelo WhatsApp aparece nesta conversa.</p>
              {erroProposta ? <p role="alert" className="text-sm text-danger">{erroProposta}</p>
                : !proposta ? <p role="status" className="text-sm text-muted-foreground">Montando a proposta…</p>
                : (
                  <>
                    {proposta.erro && <p role="alert" className="mb-3 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{proposta.erro}</p>}
                    <PropostaForm key={proposta.chave} inicial={proposta.inicial} ehGerencia={proposta.ehGerencia} vendedorNome={proposta.vendedorNome} abrirTroca={proposta.abrirTroca} />
                  </>
                )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
});

function ListaRespostas({ itens, onEscolher }: { itens: { rotulo: string; texto: string }[]; onEscolher: (texto: string) => void }) {
  return (
    <ul className="grid gap-1.5 md:grid-cols-2">
      {itens.map((r) => (
        <li key={r.rotulo}>
          <button type="button" onClick={() => onEscolher(r.texto)} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-left hover:border-primary/40">
            <span className="block text-xs font-medium">{r.rotulo}</span>
            {r.texto !== r.rotulo && <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{r.texto}</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}

function BotaoMenu({ icone: Icone, rotulo, onClick, desativado = false }: { icone: typeof FileText; rotulo: string; onClick: () => void; desativado?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={desativado} className="flex flex-col items-center gap-1.5 rounded-xl p-2 text-center text-xs font-medium text-foreground active:bg-secondary disabled:opacity-40">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary"><Icone className="h-5 w-5" aria-hidden /></span>
      {rotulo}
    </button>
  );
}
