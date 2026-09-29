"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusAparelhoBadge } from "./status-badge";
import { PublicarAparelhoButton } from "./publicar-aparelho-button";
import { ApagarAparelhoButtonCompacto } from "./apagar-aparelho-button-compacto";
import { EditarPrecoDialog } from "./editar-preco-dialog";
import { formatCurrency } from "@/utils";
import { podeVerCusto } from "@/utils/permissions";
import type { CargoUsuario } from "@/types";
import type { AparelhoComProduto } from "@/services/estoque/estoque.service";

export function AparelhosTable({ aparelhos, cargo, podeEditarPreco }: { aparelhos: AparelhoComProduto[]; cargo: CargoUsuario; podeEditarPreco: boolean }) {
  const router = useRouter();
  const podeVerCustoAtual = podeVerCusto(cargo);

  if (aparelhos.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
        Nenhum aparelho encontrado.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Modelo</TableHead>
          <TableHead>IMEI</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Preço de venda</TableHead>
          {podeVerCustoAtual && <TableHead>Custo</TableHead>}
          <TableHead>Loja virtual</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {aparelhos.map((aparelho) => (
          <TableRow
            key={aparelho.id}
            onClick={() => router.push(`/estoque/aparelhos/${aparelho.id}`)}
            className="cursor-pointer"
          >
            <TableCell>
              <Link href={`/estoque/aparelhos/${aparelho.id}`} className="font-medium text-foreground hover:underline" onClick={(e) => e.stopPropagation()}>
                {aparelho.produto?.nome ?? "—"}
              </Link>
              {aparelho.cor && <span className="ml-1 text-xs text-muted-foreground">{aparelho.cor}</span>}
            </TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">{aparelho.imei ?? "—"}</TableCell>
            <TableCell><StatusAparelhoBadge status={aparelho.status} /></TableCell>
            <TableCell onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-1.5">
                <span>{aparelho.preco_venda ? formatCurrency(aparelho.preco_venda) : "—"}</span>
                {podeEditarPreco && (
                  <EditarPrecoDialog
                    tipo="aparelho"
                    id={aparelho.id}
                    nome={aparelho.produto?.nome ?? "Aparelho"}
                    identificador={aparelho.imei}
                    precoAtual={aparelho.preco_venda}
                    precoLiquidoDesejado={aparelho.preco_liquido_desejado}
                  />
                )}
              </div>
            </TableCell>
            {podeVerCustoAtual && (
              <TableCell className="text-muted-foreground">
                {aparelho.custo ? formatCurrency(aparelho.custo) : "—"}
              </TableCell>
            )}
            <TableCell onClick={(e) => e.stopPropagation()}>
              <PublicarAparelhoButton aparelhoId={aparelho.id} publicado={aparelho.disponivel_loja_virtual} />
            </TableCell>
            <TableCell onClick={(e) => e.stopPropagation()}>
              <ApagarAparelhoButtonCompacto aparelhoId={aparelho.id} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
