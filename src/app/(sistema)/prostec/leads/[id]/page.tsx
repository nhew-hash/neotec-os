import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buscarLeadProstecPorId } from "@/services/prostec/prostec.service";
import { LeadDetalhePainel } from "@/components/prostec/lead-detalhe-painel";
import { formatDateTime } from "@/utils";

export default async function LeadProstecDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await buscarLeadProstecPorId(id);
  if (!lead) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link href="/prostec" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />Voltar pros leads
      </Link>

      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">{lead.company_full?.name ?? "—"}</h1>
        <p className="text-sm text-muted-foreground">{lead.company_full?.category} · {lead.company_full?.city}, {lead.company_full?.state}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <LeadDetalhePainel lead={lead} />

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Dados da empresa</h2>
            <dl className="flex flex-col gap-1.5 text-xs">
              <Item label="Telefone" valor={lead.company_full?.phone} />
              <Item label="WhatsApp" valor={lead.company_full?.whatsapp} />
              <Item label="Site" valor={lead.company_full?.website} />
              <Item label="Instagram" valor={lead.company_full?.instagram} />
              <Item label="Avaliação" valor={lead.company_full?.rating ? `${lead.company_full.rating} (${lead.company_full.reviews_count} avaliações)` : null} />
              <Item label="Endereço" valor={lead.company_full?.address} />
            </dl>
          </div>

          <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Histórico de status</h2>
            {lead.statusHistory.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sem mudanças ainda.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {lead.statusHistory.map((h) => (
                  <div key={h.id} className="text-xs">
                    <p className="text-foreground">{h.from_status ?? "criado"} → <strong>{h.to_status}</strong></p>
                    <p className="text-muted-foreground">{h.user?.nome ?? "—"} · {formatDateTime(h.created_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Item({ label, valor }: { label: string; valor: string | number | null | undefined }) {
  if (!valor) return null;
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{valor}</dd>
    </div>
  );
}
