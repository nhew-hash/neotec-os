import { listarCotacoes } from "@/services/cotacoes/cotacoes.service";
import { compararCotacoes } from "@/services/cotacoes/cotacoes-comparacao.service";
import { PageHeader } from "@/components/ui/page-header";
import { SeletorComparacao } from "@/components/cotacoes/seletor-comparacao";
import { TabelaComparacao } from "@/components/cotacoes/tabela-comparacao";

interface CompararPageProps {
  searchParams: Promise<{ a?: string; b?: string }>;
}

export default async function CompararCotacoesPage({ searchParams }: CompararPageProps) {
  const { a, b } = await searchParams;
  const cotacoes = await listarCotacoes();

  const resultado = a && b && a !== b ? await compararCotacoes(a, b) : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Comparar cotações" description="Veja o que mudou de preço entre dois fornecedores ou duas datas." />
      <SeletorComparacao cotacoes={cotacoes} selecionadoA={a} selecionadoB={b} />
      {resultado && <TabelaComparacao resultado={resultado} />}
    </div>
  );
}
