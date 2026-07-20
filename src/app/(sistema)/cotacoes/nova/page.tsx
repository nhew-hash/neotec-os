import { NovaCotacaoForm } from "@/components/cotacoes/nova-cotacao-form";
import { listarFornecedoresExistentes } from "@/services/cotacoes/cotacoes.service";
import { PageHeader } from "@/components/ui/page-header";

export default async function NovaCotacaoPage() {
  const fornecedores = await listarFornecedoresExistentes();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader title="Nova cotação" description="Cole a mensagem do fornecedor — a IA identifica os aparelhos automaticamente." />
      <NovaCotacaoForm fornecedoresExistentes={fornecedores} />
    </div>
  );
}
