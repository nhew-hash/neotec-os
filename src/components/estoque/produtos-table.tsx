import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils";
import { podeVerCusto } from "@/utils/permissions";
import type { Produto, CargoUsuario } from "@/types";

const CATEGORIA_LABEL: Record<Produto["categoria"], string> = {
  iphone: "iPhone",
  android: "Android",
  apple_watch: "Apple Watch",
  ipad: "iPad",
  acessorio: "Acessório",
  peca: "Peça",
};

interface ProdutosTableProps {
  produtos: Produto[];
  cargo: CargoUsuario;
}

export function ProdutosTable({ produtos, cargo }: ProdutosTableProps) {
  const podeVerCustoAtual = podeVerCusto(cargo);

  if (produtos.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
        Nenhum produto cadastrado no catálogo ainda.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Categoria</TableHead>
          <TableHead>Preço de venda</TableHead>
          {podeVerCustoAtual && <TableHead>Custo</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {produtos.map((produto) => (
          <TableRow key={produto.id}>
            <TableCell className="font-medium text-foreground">{produto.nome}</TableCell>
            <TableCell>
              <Badge variant="secondary">{CATEGORIA_LABEL[produto.categoria]}</Badge>
            </TableCell>
            <TableCell>{produto.preco_venda ? formatCurrency(produto.preco_venda) : "—"}</TableCell>
            {podeVerCustoAtual && (
              <TableCell className="text-muted-foreground">
                {produto.custo ? formatCurrency(produto.custo) : "—"}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
