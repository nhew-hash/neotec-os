"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { RefreshCw, X, RotateCcw, ChevronDown, ChevronRight, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  listarBuscasAction, listarLeadsDaBuscaAction, cancelarBuscaAction, reprocessarBuscaAction, importarNovamenteAction,
} from "@/services/prostec/scraper/scraper.actions";
import { NovaBuscaScraperForm } from "./nova-busca-scraper-form";
import { formatDateTime } from "@/utils";

export interface BuscaJob {
  id: string;
  nicho: string;
  cidade: string;
  uf: string | null;
  status: string;
  depth: number;
  buscar_email: boolean;
  buscar_redes: boolean;
  erro: string | null;
  tentativas: number;
  total_encontrados: number;
  total_novos: number;
  total_duplicados: number;
  total_bloqueados_optout: number;
  created_at: string;
  finalizado_em: string | null;
}

interface LeadDaBusca {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  instagram: string | null;
  rating: number | null;
  reviews_count: number | null;
  prostec_leads: Array<{ id: string; score: number; temperature: string; status: string }> | null;
}

const STATUS_LABELS: Record<string, string> = {
  fila: "Na fila", enviado: "Enviado", processando: "Processando", importando: "Importando",
  enriquecendo: "Enriquecendo", concluido: "Concluído", erro: "Erro", cancelado: "Cancelado",
};

const STATUS_CORES: Record<string, string> = {
  fila: "bg-secondary text-muted-foreground",
  enviado: "bg-primary/10 text-primary", processando: "bg-primary/10 text-primary", importando: "bg-primary/10 text-primary", enriquecendo: "bg-primary/10 text-primary",
  concluido: "bg-success/10 text-success",
  erro: "bg-danger/10 text-danger",
  cancelado: "bg-warning/10 text-warning-text",
};

const EM_ANDAMENTO = new Set(["fila", "enviado", "processando", "importando", "enriquecendo"]);

export function BuscasScraperLista({ buscasIniciais }: { buscasIniciais: BuscaJob[] }) {
  const [buscas, setBuscas] = useState(buscasIniciais);
  const [expandidoId, setExpandidoId] = useState<string | null>(null);
  const [leadsPorBusca, setLeadsPorBusca] = useState<Record<string, LeadDaBusca[]>>({});
  const [isPending, startTransition] = useTransition();

  const atualizarLista = useCallback(async () => {
    const result = await listarBuscasAction();
    if (result.success) setBuscas(result.data as unknown as BuscaJob[]);
  }, []);

  // Só faz sentido ficar consultando de novo enquanto tiver alguma busca
  // em andamento — evita polling infinito sem necessidade.
  useEffect(() => {
    const temEmAndamento = buscas.some((b) => EM_ANDAMENTO.has(b.status));
    if (!temEmAndamento) return;
    const intervalo = setInterval(atualizarLista, 10_000);
    return () => clearInterval(intervalo);
  }, [buscas, atualizarLista]);

  async function alternarExpandir(id: string) {
    if (expandidoId === id) return setExpandidoId(null);
    setExpandidoId(id);
    if (!leadsPorBusca[id]) {
      const result = await listarLeadsDaBuscaAction(id);
      if (result.success) setLeadsPorBusca((atual) => ({ ...atual, [id]: result.data as unknown as LeadDaBusca[] }));
    }
  }

  function handleCancelar(id: string) {
    startTransition(async () => {
      await cancelarBuscaAction(id);
      await atualizarLista();
    });
  }

  function handleReprocessar(id: string) {
    startTransition(async () => {
      await reprocessarBuscaAction(id);
      await atualizarLista();
    });
  }

  function handleImportarNovamente(id: string) {
    startTransition(async () => {
      await importarNovamenteAction(id);
      await atualizarLista();
      setLeadsPorBusca((atual) => { const copia = { ...atual }; delete copia[id]; return copia; });
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <NovaBuscaScraperForm onCriada={atualizarLista} />
        <button type="button" onClick={atualizarLista} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <RefreshCw className="h-3.5 w-3.5" />Atualizar
        </button>
      </div>

      <div className="rounded-2xl border border-black/[0.06] bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/[0.06] text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="p-3 font-medium">Nicho / Cidade</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 text-right font-medium">Encontrados</th>
              <th className="p-3 text-right font-medium">Novos</th>
              <th className="p-3 font-medium">Criada em</th>
              <th className="p-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {buscas.map((b) => (
              <BuscaLinha
                key={b.id}
                busca={b}
                expandido={expandidoId === b.id}
                leads={leadsPorBusca[b.id]}
                isPending={isPending}
                onExpandir={() => alternarExpandir(b.id)}
                onCancelar={() => handleCancelar(b.id)}
                onReprocessar={() => handleReprocessar(b.id)}
                onImportarNovamente={() => handleImportarNovamente(b.id)}
              />
            ))}
          </tbody>
        </table>

        {buscas.length === 0 && (
          <p className="py-10 text-center text-xs text-muted-foreground">Nenhuma busca ainda — clique em &quot;Nova busca&quot; pra começar.</p>
        )}
      </div>
    </div>
  );
}

function BuscaLinha({
  busca, expandido, leads, isPending, onExpandir, onCancelar, onReprocessar, onImportarNovamente,
}: {
  busca: BuscaJob;
  expandido: boolean;
  leads: LeadDaBusca[] | undefined;
  isPending: boolean;
  onExpandir: () => void;
  onCancelar: () => void;
  onReprocessar: () => void;
  onImportarNovamente: () => void;
}) {
  return (
    <>
      <tr className="border-b border-black/[0.04] last:border-0 hover:bg-secondary/30">
        <td className="p-3">
          <button type="button" onClick={onExpandir} className="flex items-center gap-1.5 text-left font-medium text-foreground hover:underline">
            {expandido ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
            {busca.nicho}
          </button>
          <p className="pl-5 text-xs text-muted-foreground">{busca.cidade}{busca.uf ? `, ${busca.uf}` : ""} · profundidade {busca.depth}</p>
        </td>
        <td className="p-3">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_CORES[busca.status] ?? "bg-secondary text-muted-foreground"}`}>
            {STATUS_LABELS[busca.status] ?? busca.status}
          </span>
          {busca.erro && <p className="mt-1 max-w-[220px] text-[10px] text-danger">{busca.erro}</p>}
        </td>
        <td className="p-3 text-right text-foreground">{busca.total_encontrados || "—"}</td>
        <td className="p-3 text-right font-medium text-foreground">
          {busca.total_novos || "—"}
          {busca.total_bloqueados_optout > 0 && <span className="ml-1 text-[10px] text-muted-foreground">({busca.total_bloqueados_optout} opt-out)</span>}
        </td>
        <td className="p-3 text-xs text-muted-foreground">{formatDateTime(busca.created_at)}</td>
        <td className="p-3">
          <div className="flex gap-1.5">
            {EM_ANDAMENTO.has(busca.status) && (
              <Button type="button" size="sm" variant="ghost" disabled={isPending} onClick={onCancelar} className="h-7 gap-1 px-2 text-[11px]">
                <X className="h-3 w-3" />Cancelar
              </Button>
            )}
            {(busca.status === "erro" || busca.status === "cancelado") && (
              <Button type="button" size="sm" variant="ghost" disabled={isPending} onClick={onReprocessar} className="h-7 gap-1 px-2 text-[11px]">
                <RotateCcw className="h-3 w-3" />Tentar de novo
              </Button>
            )}
            {busca.status === "concluido" && (
              <Button type="button" size="sm" variant="ghost" disabled={isPending} onClick={onImportarNovamente} className="h-7 gap-1 px-2 text-[11px]">
                <RefreshCw className="h-3 w-3" />Reimportar
              </Button>
            )}
          </div>
        </td>
      </tr>
      {expandido && (
        <tr className="border-b border-black/[0.04] bg-secondary/20 last:border-0">
          <td colSpan={6} className="p-3">
            {!leads ? (
              <p className="text-xs text-muted-foreground">Carregando leads...</p>
            ) : leads.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum lead importado por essa busca ainda.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {leads.map((l) => (
                  <div key={l.id} className="flex items-center justify-between gap-2 rounded-lg border border-black/[0.05] bg-white px-3 py-2 text-xs">
                    <div>
                      <p className="font-medium text-foreground">{l.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {l.whatsapp ?? l.phone ?? "sem contato"}{l.website ? ` · ${l.website}` : ""}{l.instagram ? ` · @${l.instagram}` : ""}
                        {l.rating ? ` · ⭐ ${l.rating} (${l.reviews_count ?? 0})` : ""}
                      </p>
                    </div>
                    {l.prostec_leads?.[0] && (
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                        {l.prostec_leads[0].temperature === "quente" && <Flame className="h-3 w-3" />}
                        score {l.prostec_leads[0].score}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
