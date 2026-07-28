import { notFound } from "next/navigation";
import { buscarProdutoPorId } from "@/services/estoque/estoque.service";
import { UploadFotosProduto } from "@/components/estoque/upload-fotos-produto";
import { ToggleTradeIn } from "@/components/estoque/toggle-trade-in";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/utils";

export default async function ProdutoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const produto = await buscarProdutoPorId(id);
  if (!produto) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">{produto.nome}</h1>
          <p className="text-sm text-muted-foreground">{produto.marca} {produto.modelo}</p>
        </div>
        <Badge variant={produto.visivel_loja ? "success" : "secondary"}>{produto.visivel_loja ? "Publicado" : "Não publicado"}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader><CardTitle>Fotos</CardTitle></CardHeader>
          <CardContent>
            <UploadFotosProduto tabela="produtos" itemId={produto.id} fotosIniciais={produto.fotos} />
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader><CardTitle>Dados do produto</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <Info label="Preço de venda" value={produto.preco_venda ? formatCurrency(produto.preco_venda) : null} />
            <Info label="Categoria" value={produto.categoria} />
            <Info label="Slug" value={produto.slug} />
            <Info label="Cadastrado em" value={formatDate(produto.created_at)} />
            <ToggleTradeIn produtoId={produto.id} valorInicial={produto.mostrar_trade_in} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between border-b border-border py-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">{value ?? "—"}</span>
    </div>
  );
}
