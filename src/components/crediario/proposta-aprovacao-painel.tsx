"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { decidirPropostaAction, converterPropostaEmContratoAction } from "@/services/crediario/crediario.actions";

interface Proposta { id: string; status: string }

export function PropostaAprovacaoPainel({ proposta, temOfertaSelecionada }: { proposta: Proposta; temOfertaSelecionada: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function handleDecidir(decisao: "aprovado" | "reprovado") {
    const motivo = window.prompt(`Motivo da ${decisao === "aprovado" ? "aprovação" : "reprovação"}:`);
    if (!motivo?.trim()) return;
    setErro(null);
    startTransition(async () => {
      const result = await decidirPropostaAction(proposta.id, decisao, motivo.trim());
      if (!result.success) setErro(result.error);
    });
  }

  function handleGerarContrato() {
    setErro(null);
    startTransition(async () => {
      const result = await converterPropostaEmContratoAction(proposta.id);
      if (!result.success) return setErro(result.error);
      router.push(`/contratos/${result.data.contratoId}`);
    });
  }

  if (proposta.status === "reprovada") return <p className="text-sm text-danger">Proposta reprovada.</p>;
  if (proposta.status === "convertida_contrato") return <p className="text-sm text-success">✅ Já virou contrato.</p>;

  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-foreground">Decisão</h2>
      {erro && <p className="mb-2 text-xs text-danger">{erro}</p>}

      {proposta.status === "em_analise" && (
        <div className="flex gap-2">
          <Button type="button" onClick={() => handleDecidir("aprovado")} disabled={isPending}>Aprovar</Button>
          <Button type="button" variant="outline" onClick={() => handleDecidir("reprovado")} disabled={isPending} className="text-danger">Reprovar</Button>
        </div>
      )}

      {proposta.status === "aprovada" && (
        <Button type="button" onClick={handleGerarContrato} disabled={isPending || !temOfertaSelecionada}>
          {isPending ? "Gerando..." : temOfertaSelecionada ? "Gerar contrato" : "Selecione uma oferta primeiro"}
        </Button>
      )}
    </div>
  );
}
