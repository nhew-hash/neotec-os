import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PublicarLojaDialog } from "./publicar-loja-dialog";
import { formatCurrency } from "@/utils";
import { podeVerCusto } from "@/utils/permissions";
import { cn } from "@/lib/utils";
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
  saldos: Map<string, number>;
  cargo: CargoUsuario;
}

export function ProdutosTable({ produtos, saldos, cargo }: ProdutosTableProps) {
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
          <TableHead>Estoque</TableHead>
          <TableHead>Preço de venda</TableHead>
          {podeVerCustoAtual && <TableHead>Custo</TableHead>}
          {podeVerCustoAtual && <TableHead>Lucro</TableHead>}
          <TableHead>Loja</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {produtos.map((produto) => {
          const saldo = saldos.get(produto.id) ?? 0;
          const abaixoDoMinimo = saldo <= produto.estoque_minimo;
          const lucro = produto.preco_venda != null && produto.custo != null ? produto.preco_venda - produto.custo : null;

          return (
            <TableRow key={produto.id}>
              <TableCell className="font-medium text-foreground">{produto.nome}</TableCell>
              <TableCell>
                <Badge variant="secondary">{CATEGORIA_LABEL[produto.categoria]}</Badge>
              </TableCell>
              <TableCell>
                <span className={cn("font-medium", abaixoDoMinimo ? "text-danger" : "text-foreground")}>
                  {saldo}
                </span>
                {produto.estoque_minimo > 0 && (
                  <span className="ml-1 text-xs text-muted-foreground">/ mín. {produto.estoque_minimo}</span>
                )}
                {abaixoDoMinimo && <Badge variant="danger" className="ml-2 text-[10px]">Baixo</Badge>}
              </TableCell>
              <TableCell>{produto.preco_venda ? formatCurrency(produto.preco_venda) : "—"}</TableCell>
              {podeVerCustoAtual && (
                <TableCell className="text-muted-foreground">
                  {produto.custo ? formatCurrency(produto.custo) : "—"}
                </TableCell>
              )}
              {podeVerCustoAtual && (
                <TableCell className={lucro != null && lucro >= 0 ? "text-success" : "text-muted-foreground"}>
                  {lucro != null ? formatCurrency(lucro) : "—"}
                </TableCell>
              )}
              <TableCell>
                <PublicarLojaDialog produto={produto} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
