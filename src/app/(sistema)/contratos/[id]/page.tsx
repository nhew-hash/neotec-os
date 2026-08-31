import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { buscarContratoPorId, listarSignatarios, listarDocumentosContrato, listarEventosContrato } from "@/services/contratos/contrato.service";
import { ContratoAcoesPainel } from "@/components/contratos/contrato-acoes-painel";
import { formatCurrency, formatDate, formatDateTime } from "@/utils";

const LABEL_STATUS: Record<string, string> = {
  rascunho: "Rascunho", em_revisao: "Em revisão", aguardando_assinatura: "Aguardando assinatura",
  assinatura_parcial: "Assinatura parcial", assinado: "Assinado", ativo: "Ativo", encerrando: "Encerrando",
  encerrado: "Encerrado", cancelado: "Cancelado", rescindido: "Rescindido",
};

export default async function ContratoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [contrato, signatarios, documentos, eventos] = await Promise.all([
    buscarContratoPorId(id), listarSignatarios(id), listarDocumentosContrato(id), listarEventosContrato(id),
  ]);
  if (!contrato) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link href="/contratos" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />Voltar pros contratos
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">Contrato {contrato.numero}</h1>
          <p className="text-sm text-muted-foreground">{contrato.cliente?.nome} · {LABEL_STATUS[contrato.status] ?? contrato.status}</p>
        </div>
      </div>

      {!contrato.modelo_revisado_juridicamente && (
        <div className="flex items-center gap-2 rounded-2xl border border-warning/30 bg-warning-soft p-3 text-xs text-warning-text">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          Esse contrato foi gerado com um modelo ainda NÃO revisado juridicamente — não usar como documento válido até aprovação do advogado.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Condições</h2>
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <Item label="Cliente" valor={contrato.cliente?.nome} />
              <Item label="CPF" valor={contrato.cliente?.cpf} />
              <Item label="Aparelho" valor={contrato.aparelho?.produto_nome} />
              <Item label="IMEI" valor={contrato.aparelho?.imei} />
              <Item label="Entrada" valor={contrato.valor_entrada ? formatCurrency(contrato.valor_entrada) : "—"} />
              <Item label="Frequência" valor={contrato.frequencia_pagamento} />
              <Item label="Nº pagamentos" valor={contrato.numero_pagamentos ? String(contrato.numero_pagamentos) : "—"} />
              <Item label="Valor pagamento" valor={contrato.valor_pagamento ? formatCurrency(contrato.valor_pagamento) : "—"} />
              <Item label="Início" valor={contrato.data_inicio ? formatDate(contrato.data_inicio) : "—"} />
              <Item label="Fim" valor={contrato.data_fim ? formatDate(contrato.data_fim) : "—"} />
              <Item label="Opção de aquisição" valor={contrato.tem_opcao_aquisicao ? formatCurrency(contrato.valor_opcao_aquisicao ?? 0) : "Não"} />
              <Item label="Nível de formalização" valor={contrato.nivel_formalizacao} />
            </dl>
          </div>

          <ContratoAcoesPainel contrato={contrato} signatarios={signatarios} />

          <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Documentos</h2>
            {documentos.length === 0 ? <p className="text-xs text-muted-foreground">Nenhum documento anexado ainda.</p> : (
              <div className="flex flex-col gap-2">
                {documentos.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-xl bg-secondary/40 p-2.5 text-xs">
                    <span className="text-foreground">{d.descricao ?? d.tipo}</span>
                    <span className="text-muted-foreground">{d.imutavel ? "🔒 Imutável" : formatDateTime(d.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Histórico</h2>
          <div className="flex flex-col gap-3">
            {eventos.map((e) => (
              <div key={e.id} className="border-l-2 border-primary/30 pl-3 text-xs">
                <p className="font-medium text-foreground">{e.tipo}</p>
                {e.observacao && <p className="text-muted-foreground">{e.observacao}</p>}
                <p className="text-[10px] text-muted-foreground">{e.usuario_nome ?? "Sistema"} · {formatDateTime(e.created_at)}</p>
              </div>
            ))}
            {eventos.length === 0 && <p className="text-xs text-muted-foreground">Nenhum evento ainda.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Item({ label, valor }: { label: string; valor: string | null | undefined }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{valor ?? "—"}</dd>
    </div>
  );
}
