"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Wrench, Receipt, StickyNote, ChevronDown, Kanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { criarFollowupAction, moverCardEtapaAction, listarEtapasAction } from "@/services/crm-pipeline/crm-pipeline.actions";
import type { CrmEtapa } from "@/types";

interface AcoesRapidasProps {
  clienteId: string | null;
  cardId: string | null;
  /** Dentro do painel do cliente: já aberto, sem o botão de expandir. */
  sempreAberto?: boolean;
}

/**
 * "Enviar catálogo" e "Enviar localização" ficaram de fora — dependem de
 * conteúdo real que ainda não existe configurado no sistema (um PDF de
 * catálogo, coordenadas fixas da loja). Adicionar o botão sem ter o que
 * enviar seria pior do que não ter o botão.
 */
export function AcoesRapidas({ clienteId, cardId, sempreAberto = false }: AcoesRapidasProps) {
  const router = useRouter();
  const [expandidoInterno, setExpandido] = useState(false);
  const expandido = sempreAberto || expandidoInterno;
  const [mostrarObservacao, setMostrarObservacao] = useState(false);
  const [observacao, setObservacao] = useState("");
  const [isPending, startTransition] = useTransition();
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [etapas, setEtapas] = useState<CrmEtapa[]>([]);
  const [movendoEtapa, setMovendoEtapa] = useState(false);

  useEffect(() => {
    if (!expandido || !cardId || etapas.length > 0) return;
    listarEtapasAction().then((result) => {
      if (result.success) setEtapas(result.data);
      else setMensagem(result.error);
    });
  }, [expandido, cardId, etapas.length]);

  function handleSalvarObservacao() {
    if ((!cardId && !clienteId) || !observacao.trim()) return;
    startTransition(async () => {
      const formData = new FormData();
      if (cardId) formData.set("card_id", cardId);
      else if (clienteId) formData.set("cliente_id", clienteId);
      formData.set("data_agendada", new Date().toISOString());
      formData.set("motivo", `📝 ${observacao.trim()}`);
      const result = await criarFollowupAction(formData);
      setMensagem(result.success ? "Observação salva no CRM." : result.error);
      if (result.success) {
        setObservacao("");
        setMostrarObservacao(false);
      }
    });
  }

  async function handleMoverEtapa(etapaId: string) {
    if (!cardId) return;
    setMovendoEtapa(true);
    const result = await moverCardEtapaAction(cardId, etapaId);
    setMovendoEtapa(false);
    // Antes mostrava "atualizada" sem olhar o resultado.
    setMensagem(result.success ? "Etapa do CRM atualizada." : result.error);
    if (result.success) router.refresh();
  }

  return (
    <div className={sempreAberto ? undefined : "border-t border-border"}>
      {!sempreAberto && <button
        type="button"
        onClick={() => setExpandido((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        aria-expanded={expandido}
      >
        Ações rápidas
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expandido ? "rotate-180" : ""}`} />
      </button>}

      {expandido && (
        <div className={sempreAberto ? "flex flex-col gap-2" : "flex flex-col gap-2 px-3 pb-3"}>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline" size="sm"
              onClick={() => router.push(clienteId ? `/assistencia/nova?clienteId=${clienteId}` : "/assistencia/nova")}
            >
              <Wrench className="h-3.5 w-3.5" />Criar OS
            </Button>
            <Button
              variant="outline" size="sm"
              onClick={() => router.push(clienteId ? `/vendas/orcamentos/novo?clienteId=${clienteId}` : "/vendas/orcamentos/novo")}
            >
              <Receipt className="h-3.5 w-3.5" />Criar orçamento
            </Button>
            <Button
              variant="outline" size="sm"
              disabled={!cardId && !clienteId}
              title={!cardId && !clienteId ? "Essa conversa ainda não está vinculada a um cliente" : undefined}
              onClick={() => setMostrarObservacao((v) => !v)}
            >
              <StickyNote className="h-3.5 w-3.5" />Adicionar observação
            </Button>
          </div>

          {cardId && etapas.length > 0 && (
            <div className="flex items-center gap-2">
              <Kanban className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <Select disabled={movendoEtapa} onValueChange={handleMoverEtapa}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Mudar etapa no CRM" /></SelectTrigger>
                <SelectContent>
                  {etapas.map((etapa) => <SelectItem key={etapa.id} value={etapa.id}>{etapa.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {mostrarObservacao && (
            <div className="flex flex-col gap-2">
              <Textarea
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Anota algo importante sobre esse cliente/conversa..."
                rows={2}
              />
              <Button size="sm" onClick={handleSalvarObservacao} disabled={isPending || !observacao.trim()} className="w-fit">
                {isPending ? "Salvando..." : "Salvar no CRM"}
              </Button>
            </div>
          )}

          {mensagem && <p className="text-xs text-muted-foreground">{mensagem}</p>}
        </div>
      )}
    </div>
  );
}
