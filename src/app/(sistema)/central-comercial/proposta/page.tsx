import { PageHeader } from "@/components/ui/page-header";
import { createClient } from "@/lib/supabase/server";
import { PropostaForm, type OpcaoCliente, type OpcaoItem } from "@/components/central-comercial/proposta-form";

export const metadata = { title: "Proposta" };
export const dynamic = "force-dynamic";

export default async function PropostaPage() {
  const supabase = await createClient();
  const [aparelhosRes, produtosRes, clientesRes] = await Promise.all([
    // View mascarada: custo e preço mínimo vêm nulos para quem não é admin — e nem são selecionados aqui.
    supabase.from("vw_aparelhos_seguro").select("id, produto_id, cor, memoria, condicao, preco_venda").eq("status", "disponivel").gt("preco_venda", 0).limit(300),
    supabase.from("produtos").select("id, nome, preco_venda").eq("status", "ativo").gt("preco_venda", 0).order("nome").limit(300),
    supabase.from("clientes").select("id, nome").order("nome").limit(400),
  ]);

  const produtos = produtosRes.data ?? [];
  const nomeProduto = new Map(produtos.map((p) => [p.id, p.nome]));
  const idsFaltando = [...new Set((aparelhosRes.data ?? []).map((a) => a.produto_id).filter((id) => id && !nomeProduto.has(id)))];
  if (idsFaltando.length > 0) {
    const { data } = await supabase.from("produtos").select("id, nome").in("id", idsFaltando);
    for (const p of data ?? []) nomeProduto.set(p.id, p.nome);
  }

  const itens: OpcaoItem[] = [
    ...(aparelhosRes.data ?? []).map((a): OpcaoItem => ({
      tipo: "aparelho", id: a.id, preco: Number(a.preco_venda),
      rotulo: [nomeProduto.get(a.produto_id) ?? "Aparelho", a.memoria, a.cor, a.condicao].filter(Boolean).join(" · "),
    })),
    ...produtos.map((p): OpcaoItem => ({ tipo: "produto", id: p.id, preco: Number(p.preco_venda), rotulo: p.nome })),
  ];
  const clientes: OpcaoCliente[] = (clientesRes.data ?? []).map((c) => ({ id: c.id, nome: c.nome }));

  return (
    <div className="space-y-6">
      <PageHeader title="Proposta" description="À vista e parcelado, calculados pelo mesmo motor de preços da loja virtual." />
      {aparelhosRes.error || produtosRes.error ? (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">Não foi possível carregar os itens agora. Tente novamente em instantes.</p>
      ) : (
        <PropostaForm itens={itens} clientes={clientes} />
      )}
    </div>
  );
}
