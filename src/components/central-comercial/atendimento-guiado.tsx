"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Smartphone } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/format";
import { ClienteBusca } from "./cliente-busca";
import type { ClienteResultado } from "@/services/central-comercial/clientes-busca.service";
import type { GrupoCatalogo, ItemCatalogo } from "@/services/central-comercial/catalogo";
import { paramItensProposta } from "@/services/central-comercial/catalogo";
import {
  ETAPAS_ROTEIRO, NECESSIDADE_VAZIA, ROTULO_PAGAMENTO, ROTULO_PRIORIDADE,
  fraseConfirmacao, recomendar, resumoNecessidade,
  type FormaPagamento, type Necessidade, type Prioridade,
} from "@/services/central-comercial/roteiro-venda";

const chave = (i: ItemCatalogo) => `${i.tipo}:${i.id}`;
const numero = (v: string) => Number(v.replace(/\D/g, "")) || null;

function Diga({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg bg-accent px-3 py-2 text-sm"><span className="font-semibold text-accent-foreground/80">Diga: </span><span className="italic">“{children}”</span></p>;
}

function Chip({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={ativo} onClick={onClick}
      className={cn("h-9 rounded-full border px-3.5 text-sm transition-colors", ativo ? "border-foreground bg-foreground text-background" : "border-border bg-background hover:bg-secondary")}>
      {children}
    </button>
  );
}

const TIPOS = [
  { id: "iphone", label: "iPhone", grupos: ["iphone_seminovo"] as GrupoCatalogo[] },
  { id: "android", label: "Android", grupos: ["android"] as GrupoCatalogo[] },
  { id: "apple", label: "iPad, Mac e Watch", grupos: ["apple"] as GrupoCatalogo[] },
  { id: "todos", label: "Qualquer um", grupos: [] as GrupoCatalogo[] },
] as const;

/**
 * Fluxo do Manual de Vendas: Entender → Indicar → (proposta: Negociar → Fechar).
 * As falas aparecem em cada etapa; a necessidade vira a observação interna da
 * proposta e a indicação segue a regra "uma principal + uma alternativa".
 */
export function AtendimentoGuiado({ itens, clienteInicial }: { itens: ItemCatalogo[]; clienteInicial: ClienteResultado | null }) {
  const router = useRouter();
  const [etapa, setEtapa] = useState<0 | 1>(0);
  const [cliente, setCliente] = useState<ClienteResultado | null>(clienteInicial);
  const [n, setN] = useState<Necessidade>(NECESSIDADE_VAZIA);
  const [orcamentoTxt, setOrcamentoTxt] = useState("");
  const [parcelaTxt, setParcelaTxt] = useState("");
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]["id"]>("iphone");
  const [escolhidos, setEscolhidos] = useState<Set<string>>(new Set());

  const necessidade: Necessidade = { ...n, orcamento: numero(orcamentoTxt), parcelaDesejada: numero(parcelaTxt) };
  const confirmacao = fraseConfirmacao(necessidade);
  const grupos = TIPOS.find((t) => t.id === tipo)?.grupos ?? [];
  // Lacrado (encomenda) entra no tipo pelo nome do modelo.
  const familiaLacrado = (nome: string) => (/iphone/i.test(nome) ? "iphone" : /\bipad\b|apple\s*watch|macbook|\bimac\b|mac\s*(mini|studio)/i.test(nome) ? "apple" : "android");
  const noTipo = (i: ItemCatalogo) => i.vaiParaProposta && (grupos.length === 0 || grupos.includes(i.grupo) || (i.grupo === "lacrado" && familiaLacrado(i.nome) === tipo));
  const indicacao = recomendar(itens, necessidade, noTipo);
  const outras = useMemo(() => {
    if (!necessidade.orcamento) return [];
    const usados = new Set([indicacao.principal, indicacao.alternativa].filter(Boolean).map((i) => chave(i!)));
    return itens.filter((i) => noTipo(i) && i.preco <= necessidade.orcamento! * 1.2 && !usados.has(chave(i))).sort((a, b) => b.preco - a.preco).slice(0, 6);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itens, necessidade.orcamento, tipo, indicacao.principal?.id, indicacao.alternativa?.id]);

  const alternarPrioridade = (p: Prioridade) => setN((x) => ({ ...x, prioridades: x.prioridades.includes(p) ? x.prioridades.filter((y) => y !== p) : [...x.prioridades, p] }));
  const alternarItem = (i: ItemCatalogo) => setEscolhidos((s) => { const novo = new Set(s); if (novo.has(chave(i))) novo.delete(chave(i)); else novo.add(chave(i)); return novo; });

  function montarProposta() {
    const selecionados = itens.filter((i) => escolhidos.has(chave(i)));
    const params = new URLSearchParams();
    if (cliente) params.set("cliente", cliente.id);
    const lista = paramItensProposta(selecionados);
    if (lista) params.set("itens", lista);
    const nota = resumoNecessidade(necessidade);
    if (nota) params.set("nota", nota);
    if (necessidade.troca) params.set("troca", "1");
    router.push(`/central-comercial/proposta?${params.toString()}`);
  }

  function CardItem({ item, rotulo }: { item: ItemCatalogo; rotulo?: string }) {
    const sel = escolhidos.has(chave(item));
    return (
      <button type="button" onClick={() => alternarItem(item)} aria-pressed={sel}
        className={cn("flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-shadow", sel ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/40")}>
        <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#F5F5F7]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {item.foto ? <img src={item.foto} alt="" className="h-full w-full object-contain p-1" /> : <Smartphone className="h-7 w-7 text-black/15" strokeWidth={1} aria-hidden />}
        </span>
        <span className="min-w-0 flex-1">
          {rotulo && <span className="text-[11px] font-semibold uppercase tracking-wide text-primary">{rotulo}</span>}
          <span className="block truncate text-sm font-medium">{item.nome}</span>
          <span className="block truncate text-xs text-muted-foreground">{item.detalhes.join(" · ")}</span>
          <span className="block text-sm font-semibold tabular-nums">{formatCurrency(item.preco)}</span>
        </span>
        <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2", sel ? "border-primary bg-primary text-white" : "border-black/20")}>{sel && <Check className="h-3.5 w-3.5" aria-hidden />}</span>
      </button>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-8">
      <ol className="-mx-1 flex max-w-full items-center gap-2 overflow-x-auto px-1 pb-1 text-sm" aria-label="Etapas do atendimento">
        {ETAPAS_ROTEIRO.map((e, i) => {
          const atual = (etapa === 0 && i === 0) || (etapa === 1 && i === 1);
          const feito = etapa === 1 && i === 0;
          return (
            <li key={e.id} className="flex items-center gap-2">
              <span className={cn("flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 font-medium", atual ? "bg-primary text-primary-foreground" : feito ? "bg-success-soft text-success-text" : "bg-secondary text-muted-foreground")}>
                {feito && <Check className="h-3.5 w-3.5" aria-hidden />}{i + 1}. {e.titulo}
              </span>
              {i < ETAPAS_ROTEIRO.length - 1 && <span className="h-px w-3 bg-border" aria-hidden />}
            </li>
          );
        })}
      </ol>

      {etapa === 0 ? (
        <>
          <Card className="space-y-3 p-5">
            <h2 className="font-display text-base font-semibold">Receber e acomodar</h2>
            <Diga>Seja muito bem-vindo à Neotec! Como posso te ajudar hoje? Fique à vontade, aceita um café ou uma água?</Diga>
            <p className="text-sm font-medium">Cliente</p>
            <ClienteBusca cliente={cliente} onSelecionar={setCliente} />
            {!cliente && <p className="text-xs text-muted-foreground">Ainda não sabe o nome? Pergunte: “Como você se chama?”. Dá para seguir e escolher o cliente na proposta.</p>}
          </Card>

          <Card className="space-y-4 p-5">
            <h2 className="font-display text-base font-semibold">Entender a necessidade</h2>
            <Diga>{ETAPAS_ROTEIRO[0].fala}</Diga>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Qual celular você usa hoje?</span>
                <Input value={n.aparelhoAtual} onChange={(e) => setN({ ...n, aparelhoAtual: e.target.value })} placeholder="ex.: iPhone 11" className="h-11" /></label>
              <label className="flex flex-col gap-1 text-sm"><span className="font-medium">O que você mais sente falta nele?</span>
                <Input value={n.faltaNele} onChange={(e) => setN({ ...n, faltaNele: e.target.value })} placeholder="ex.: bateria que dure o dia" className="h-11" /></label>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Você prioriza câmera, bateria, desempenho ou espaço?</p>
              <div className="flex flex-wrap gap-2">{(Object.keys(ROTULO_PRIORIDADE) as Prioridade[]).map((p) => <Chip key={p} ativo={n.prioridades.includes(p)} onClick={() => alternarPrioridade(p)}>{ROTULO_PRIORIDADE[p]}</Chip>)}</div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Quanto pretende investir? (R$)</span>
                <Input value={orcamentoTxt} onChange={(e) => setOrcamentoTxt(e.target.value)} inputMode="numeric" placeholder="ex.: 3000" className="h-11" /></label>
              <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Ou uma parcela que gostaria de manter? (R$)</span>
                <Input value={parcelaTxt} onChange={(e) => setParcelaTxt(e.target.value)} inputMode="numeric" placeholder="ex.: 250" className="h-11" /></label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5"><p className="text-sm font-medium">Tem aparelho para dar na troca?</p>
                <div className="flex gap-2"><Chip ativo={n.troca === true} onClick={() => setN({ ...n, troca: n.troca === true ? null : true })}>Sim</Chip><Chip ativo={n.troca === false} onClick={() => setN({ ...n, troca: n.troca === false ? null : false })}>Não</Chip></div></div>
              <div className="space-y-1.5"><p className="text-sm font-medium">Pix, cartão ou boleto?</p>
                <div className="flex flex-wrap gap-2">{(Object.keys(ROTULO_PAGAMENTO) as FormaPagamento[]).map((f) => <Chip key={f} ativo={n.pagamento === f} onClick={() => setN({ ...n, pagamento: n.pagamento === f ? null : f })}>{ROTULO_PAGAMENTO[f]}</Chip>)}</div></div>
            </div>
            {confirmacao && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Confirme o que entendeu</p>
                <p className="mt-1 italic">“{confirmacao}”</p>
              </div>
            )}
            <p className="text-xs text-muted-foreground">Regra de ouro: se o cliente ainda não sabe o que quer, ajude a descobrir — sem virar interrogatório.</p>
          </Card>

          <div className="flex justify-end">
            <Button type="button" size="lg" onClick={() => setEtapa(1)}>Indicar <ArrowRight className="ml-1 h-4 w-4" aria-hidden /></Button>
          </div>
        </>
      ) : (
        <>
          <Card className="space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-base font-semibold">Indicar</h2>
              <div className="flex flex-wrap gap-1.5">{TIPOS.map((t) => <Chip key={t.id} ativo={tipo === t.id} onClick={() => setTipo(t.id)}>{t.label}</Chip>)}</div>
            </div>
            {!necessidade.orcamento ? (
              <div className="space-y-2 text-sm">
                <p>Para indicar com honestidade, falta saber quanto o cliente pretende investir.</p>
                <Diga>Qual seria um investimento confortável para você?</Diga>
                <Button type="button" variant="outline" size="sm" onClick={() => setEtapa(0)}><ArrowLeft className="mr-1 h-4 w-4" aria-hidden />Voltar e preencher</Button>
              </div>
            ) : !indicacao.principal && !indicacao.alternativa ? (
              <p className="text-sm text-muted-foreground">Nada em estoque até {formatCurrency(necessidade.orcamento * 1.2)} neste tipo. Mude o tipo acima ou veja o <Link href={`/central-comercial/catalogo${cliente ? `?cliente=${cliente.id}` : ""}`} className="font-medium text-primary hover:underline">catálogo completo</Link>.</p>
            ) : (
              <>
                <Diga>Pelo que você me contou, vou priorizar o que você precisa sem ultrapassar muito seu orçamento. Esta opção faz sentido para você. Vou te mostrar também uma alternativa, caso valha a pena investir um pouco mais.</Diga>
                <div className="grid gap-3 sm:grid-cols-2">
                  {indicacao.principal ? <CardItem item={indicacao.principal} rotulo="Indicação principal" /> : <p className="rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground">Nada dentro de {formatCurrency(necessidade.orcamento)} neste tipo.</p>}
                  {indicacao.alternativa && <CardItem item={indicacao.alternativa} rotulo="Alternativa (um pouco acima)" />}
                </div>
                <Diga>{ETAPAS_ROTEIRO[2].fala}</Diga>
                <p className="text-xs text-muted-foreground">Evite mostrar muitos modelos de uma vez. Se achar caro, descubra se o problema é o total ou a parcela.</p>
              </>
            )}
            {outras.length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer text-sm font-medium text-primary">Outras opções nessa faixa ({outras.length})</summary>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">{outras.map((i) => <CardItem key={chave(i)} item={i} />)}</div>
              </details>
            )}
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button type="button" variant="ghost" onClick={() => setEtapa(0)}><ArrowLeft className="mr-1 h-4 w-4" aria-hidden />Entender</Button>
            <div className="flex items-center gap-2">
              <Link href={`/central-comercial/catalogo${cliente ? `?cliente=${cliente.id}` : ""}`} className={buttonVariants({ variant: "outline" })}>Catálogo completo</Link>
              <Button type="button" size="lg" onClick={montarProposta}>Montar proposta{escolhidos.size > 0 ? ` (${escolhidos.size})` : ""} <ArrowRight className="ml-1 h-4 w-4" aria-hidden /></Button>
            </div>
          </div>
          <p className="text-right text-xs text-muted-foreground">Na proposta: valores, troca{necessidade.troca ? " (o checklist já abre)" : ""}, objeções e fechamento.</p>
        </>
      )}
    </div>
  );
}
