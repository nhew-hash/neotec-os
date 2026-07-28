"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Smartphone, Sparkles as SparklesIcon, Package } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatCurrency } from "@/utils";

export interface ItemLojaVirtual {
  tipo: "seminovo" | "lacrado" | "produto";
  categoria: string;
  nome: string;
  detalhe: string;
  preco: number | null;
  href: string;
}

const LABEL_TIPO: Record<ItemLojaVirtual["tipo"], { label: string; icon: typeof Smartphone; cor: string }> = {
  seminovo: { label: "Seminovo", icon: Smartphone, cor: "bg-primary/10 text-primary" },
  lacrado: { label: "Lacrado", icon: SparklesIcon, cor: "bg-success/10 text-success" },
  produto: { label: "Produto", icon: Package, cor: "bg-warning/10 text-warning" },
};

function labelCategoriaAdmin(categoria: string): string {
  const conhecidas: Record<string, string> = {
    iphone: "iPhone", android: "Android", apple_watch: "Apple Watch",
    ipad: "iPad", mac: "Mac", acessorio: "Acessórios", tablet: "Tablets",
  };
  // Categoria nova que a IA criou (ex: "jbl", "videogame") — capitaliza
  // e mostra do jeito que foi salva, sem precisar cadastrar rótulo antes.
  return conhecidas[categoria] ?? categoria.charAt(0).toUpperCase() + categoria.slice(1).replace(/_/g, " ");
}

/** Abas de categoria calculadas a partir do que EXISTE de verdade nos dados — categoria nova (JBL, videogame, o que vier) aparece sozinha, nunca precisa editar essa tela quando surge uma categoria nova. */
export function LojaVirtualTabelaCliente({ itens }: { itens: ItemLojaVirtual[] }) {
  const categorias = useMemo(() => {
    const contagem = new Map<string, number>();
    for (const item of itens) contagem.set(item.categoria, (contagem.get(item.categoria) ?? 0) + 1);
    return Array.from(contagem.entries()).sort((a, b) => b[1] - a[1]); // mais itens primeiro
  }, [itens]);

  const [abaAtiva, setAbaAtiva] = useState("todas");

  const itensFiltrados = abaAtiva === "todas" ? itens : itens.filter((i) => i.categoria === abaAtiva);

  if (itens.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
        Nada publicado na loja virtual ainda.
      </div>
    );
  }

  return (
    <Tabs value={abaAtiva} onValueChange={setAbaAtiva}>
      <TabsList className="flex-wrap">
        <TabsTrigger value="todas">Todas ({itens.length})</TabsTrigger>
        {categorias.map(([categoria, total]) => (
          <TabsTrigger key={categoria} value={categoria}>{labelCategoriaAdmin(categoria)} ({total})</TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value={abaAtiva}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Detalhe</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {itensFiltrados.map((item, i) => {
              const tipo = LABEL_TIPO[item.tipo];
              return (
                <TableRow key={i}>
                  <TableCell><Badge className={tipo.cor}><tipo.icon className="h-3 w-3" />{tipo.label}</Badge></TableCell>
                  <TableCell className="font-medium text-foreground">{item.nome}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{item.detalhe}</TableCell>
                  <TableCell>{item.preco ? formatCurrency(item.preco) : "—"}</TableCell>
                  <TableCell>
                    {item.href !== "#" && (
                      <Link href={item.href} target="_blank" className="text-xs font-medium text-primary hover:underline">Ver na loja →</Link>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TabsContent>
    </Tabs>
  );
}
