import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { STATUS_PRODUTO, type StatusProduto } from "@/lib/achadinhos/tipos";
import { listarProdutosAdmin, obterContextoAdmin, resumoDoPainel } from "@/services/achadinhos/achadinhos.admin.service";
import { ProdutosTabela } from "@/components/achadinhos-admin/produtos-tabela";
import { FiltrosProdutos } from "@/components/achadinhos-admin/filtros-produtos";

export const metadata = { title: "Achadinhos" };

export default async function AchadinhosAdminPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const sp = await searchParams;
  const ctx = (await obterContextoAdmin())!;
  const status = STATUS_PRODUTO.includes(sp.status as StatusProduto) ? (sp.status as StatusProduto) : undefined;
  const busca = sp.q?.trim() || undefined;
  const [produtos, resumo] = await Promise.all([listarProdutosAdmin(ctx, { status, busca }), resumoDoPainel(ctx)]);

  const cards = [
    { rotulo: "No site agora", valor: resumo.ativos },
    { rotulo: "Rascunhos", valor: resumo.rascunhos },
    { rotulo: "Pausados", valor: resumo.pausados },
    { rotulo: "Cliques para o Mercado Livre", valor: resumo.cliques_total },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Achadinhos da Neotec"
        description="Cadastre ofertas, escolha o que aparece no site e acompanhe os cliques."
        actions={
          <div className="flex gap-2">
            <Link href="/achadinhos" target="_blank" className={buttonVariants({ variant: "outline" })}>Ver o site</Link>
            <Link href="/achadinhos-admin/novo" className={buttonVariants()}><Plus /> Novo produto</Link>
          </div>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.rotulo} className="p-4">
            <p className="text-2xl font-semibold tabular-nums">{c.valor.toLocaleString("pt-BR")}</p>
            <p className="text-xs text-muted-foreground">{c.rotulo}</p>
          </Card>
        ))}
      </div>
      <FiltrosProdutos status={status} busca={busca} />
      <ProdutosTabela produtos={produtos} podeExcluir={ctx.cargo === "admin"} filtrando={!!status || !!busca} />
    </div>
  );
}
