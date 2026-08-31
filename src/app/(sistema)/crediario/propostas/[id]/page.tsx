import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buscarPropostaPorId, listarOfertasDaProposta } from "@/services/crediario/crediario.service";
import { PropostaOfertasPainel } from "@/components/crediario/proposta-ofertas-painel";
import { PropostaAprovacaoPainel } from "@/components/crediario/proposta-aprovacao-painel";
import { formatCurrency } from "@/utils";

export default async function PropostaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [proposta, ofertas] = await Promise.all([buscarPropostaPorId(id), listarOfertasDaProposta(id)]);
  if (!proposta) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link href="/crediario" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />Voltar pro crediário
      </Link>

      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">{proposta.cliente?.nome}</h1>
        <p className="text-sm text-muted-foreground">Análise de crédito</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CardInfo label="Score Neotec" valor={proposta.score_neotec != null ? String(proposta.score_neotec) : "—"} />
        <CardInfo label="Classe" valor={proposta.classe?.nome ?? "—"} />
        <CardInfo label="Limite recomendado" valor={proposta.limite_recomendado ? formatCurrency(proposta.limite_recomendado) : "—"} />
        <CardInfo label="Fiador exigido" valor={proposta.classe?.fiador_obrigatorio ? "Sim" : "Não"} alerta={!!proposta.classe?.fiador_obrigatorio} />
      </div>

      {proposta.possui_restricao && (
        <div className="rounded-2xl border border-warning/30 bg-warning-soft p-3 text-xs text-warning-text">
          ⚠ Cliente possui restrição (negativado) — condições ajustadas automaticamente (entrada maior, exige fiador), mas isso não reprova sozinho.
        </div>
      )}

      <PropostaOfertasPainel propostaId={id} ofertas={ofertas} frequenciasPermitidas={proposta.classe?.frequencias_permitidas ?? ["mensal"]} />

      <PropostaAprovacaoPainel proposta={proposta} temOfertaSelecionada={ofertas.some((o) => o.selecionada)} />
    </div>
  );
}

function CardInfo({ label, valor, alerta }: { label: string; valor: string; alerta?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className={`font-display text-lg font-bold ${alerta ? "text-warning-text" : "text-foreground"}`}>{valor}</span>
    </div>
  );
}
