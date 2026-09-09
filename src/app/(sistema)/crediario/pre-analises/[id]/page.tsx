import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buscarPreAnalisePorId, LABEL_ESTADO_TROCA, LABEL_TIPO_TRABALHO, LABEL_TEMPO, LABEL_ESTADO_CIVIL, LABEL_DEPENDENTES, LABEL_MORADIA, LABEL_TEMPO_MORADIA } from "@/services/pre-analise/pre-analise.service";
import { PreAnaliseAcoesPainel } from "@/components/pre-analise/pre-analise-acoes-painel";
import { formatCurrency, formatDateTime } from "@/utils";

const COR_INDICADOR: Record<string, { emoji: string; label: string }> = {
  bom_potencial: { emoji: "🟢", label: "Bom potencial" }, analise_manual: { emoji: "🟡", label: "Análise manual" }, baixo_potencial: { emoji: "🔴", label: "Baixo potencial" },
};

export default async function PreAnaliseDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pre = await buscarPreAnalisePorId(id);
  if (!pre) notFound();

  const whatsappLink = `https://wa.me/55${pre.whatsapp}`;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/crediario/pre-analises" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />Voltar pras pré-análises
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">{pre.nome}</h1>
          <p className="text-sm text-muted-foreground">{pre.whatsapp} · Recebido em {formatDateTime(pre.created_at)}</p>
        </div>
        {pre.indicador && (
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-foreground">
            {COR_INDICADOR[pre.indicador]?.emoji} {COR_INDICADOR[pre.indicador]?.label} — indicador interno, não é aprovação
          </span>
        )}
      </div>

      <PreAnaliseAcoesPainel id={id} status={pre.status} observacoesAtuais={pre.observacoes_internas} whatsappLink={whatsappLink} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Bloco titulo="📱 Aparelho e condições">
          <Item label="Aparelho desejado" valor={pre.aparelho_desejado} />
          <Item label="Entrada" valor={formatCurrency(pre.entrada)} />
          <Item label="Parcela desejada" valor={`${formatCurrency(pre.parcela_desejada)}/mês`} />
        </Bloco>

        <Bloco titulo="🔄 Aparelho na troca">
          <Item label="Possui" valor={pre.tem_aparelho_troca ? "Sim" : "Não"} />
          {pre.tem_aparelho_troca && (
            <>
              <Item label="Modelo" valor={pre.aparelho_troca_modelo ?? "—"} />
              <Item label="Estado" valor={pre.aparelho_troca_estado ? LABEL_ESTADO_TROCA[pre.aparelho_troca_estado] : "—"} />
              <Item label="Defeito" valor={pre.aparelho_troca_defeito ?? "Nenhum"} />
            </>
          )}
        </Bloco>

        <Bloco titulo="💼 Profissional">
          <Item label="Trabalha" valor={pre.trabalha ? "Sim" : "Não"} />
          {pre.trabalha && (
            <>
              <Item label="Tipo" valor={pre.tipo_trabalho ? LABEL_TIPO_TRABALHO[pre.tipo_trabalho] : "—"} />
              <Item label="Tempo" valor={pre.tempo_trabalho ? LABEL_TEMPO[pre.tempo_trabalho] : "—"} />
            </>
          )}
          <Item label="Renda mensal" valor={formatCurrency(pre.renda_mensal)} />
        </Bloco>

        <Bloco titulo="👨‍👩‍👧 Família e moradia">
          <Item label="Estado civil" valor={LABEL_ESTADO_CIVIL[pre.estado_civil]} />
          <Item label="Dependentes" valor={LABEL_DEPENDENTES[pre.dependentes]} />
          <Item label="Moradia" valor={LABEL_MORADIA[pre.moradia]} />
          <Item label="Tempo de moradia" valor={LABEL_TEMPO_MORADIA[pre.tempo_moradia]} />
        </Bloco>
      </div>
    </div>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-foreground">{titulo}</h2>
      <dl className="flex flex-col gap-1.5 text-xs">{children}</dl>
    </div>
  );
}

function Item({ label, valor }: { label: string; valor: string }) {
  return <div className="flex justify-between"><dt className="text-muted-foreground">{label}</dt><dd className="font-medium text-foreground">{valor}</dd></div>;
}
