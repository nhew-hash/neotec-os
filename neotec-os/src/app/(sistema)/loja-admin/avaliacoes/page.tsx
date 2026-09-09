import { listarAvaliacoes } from "@/services/loja-admin/central-loja.service";
import { AvaliacoesPanel } from "@/components/loja-admin/avaliacoes-panel";
import { PageHeader } from "@/components/ui/page-header";

export default async function AvaliacoesPage() {
  const avaliacoes = await listarAvaliacoes();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Avaliações" description="Aprova antes de publicar na loja — nada aparece sem revisão" />
      <AvaliacoesPanel avaliacoes={avaliacoes} />
    </div>
  );
}
