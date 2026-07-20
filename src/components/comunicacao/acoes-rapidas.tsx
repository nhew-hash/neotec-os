"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Wrench, Receipt, StickyNote, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { criarFollowupAction } from "@/services/crm-pipeline/crm-pipeline.actions";

interface AcoesRapidasProps {
  clienteId: string | null;
  cardId: string | null;
}

/**
 * "Enviar catálogo" e "Enviar localização" ficaram de fora — dependem de
 * conteúdo real que ainda não existe configurado no sistema (um PDF de
 * catálogo, coordenadas fixas da loja). Adicionar o botão sem ter o que
 * enviar seria pior do que não ter o botão.
 */
export function AcoesRapidas({ clienteId, cardId }: AcoesRapidasProps) {
  const router = useRouter();
  const [expandido, setExpandido] = useState(false);
  const [mostrarObservacao, setMostrarObservacao] = useState(false);
  const [observacao, setObservacao] = useState("");
  const [isPending, startTransition] = useTransition();
  const [mensagem, setMensagem] = useState<string | null>(null);

  function handleSalvarObservacao() {
    if (!cardId || !observacao.trim()) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("card_id", cardId);
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

  return (
    <div className="border-t border-border">
      <button
        type="button"
        onClick={() => setExpandido((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        Ações rápidas
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expandido ? "rotate-180" : ""}`} />
      </button>

      {expandido && (
        <div className="flex flex-col gap-2 px-3 pb-3">
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
              disabled={!cardId}
              title={!cardId ? "Essa conversa ainda não está vinculada a uma oportunidade no CRM" : undefined}
              onClick={() => setMostrarObservacao((v) => !v)}
            >
              <StickyNote className="h-3.5 w-3.5" />Adicionar observação
            </Button>
          </div>

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
