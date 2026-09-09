import Link from "next/link";
import { Plus, PackagePlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listarProdutos, listarAparelhos, listarSaldosProdutos } from "@/services/estoque/estoque.service";
import { ProdutosTable } from "@/components/estoque/produtos-table";
import { AparelhosTable } from "@/components/estoque/aparelhos-table";
import { LojaVirtualUnificadaTable } from "@/components/estoque/loja-virtual-unificada-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CargoUsuario } from "@/types";

export default async function EstoquePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: perfil } = await supabase
    .from("usuarios")
    .select("cargo")
    .eq("id", user?.id ?? "")
    .single<{ cargo: CargoUsuario }>();

  const cargo = perfil?.cargo ?? "vendedor";
  const [produtos, aparelhos, saldos] = await Promise.all([
    listarProdutos(), listarAparelhos(), listarSaldosProdutos(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">Estoque</h1>
          <p className="text-sm text-muted-foreground">
            {aparelhos.length} aparelho(s) · {produtos.length} produto(s) no catálogo
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/estoque/produtos/novo"><Plus className="h-4 w-4" />Produto</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/estoque/entrada-lote"><PackagePlus className="h-4 w-4" />Entrada em lote</Link>
          </Button>
          <Button asChild>
            <Link href="/estoque/aparelhos/novo"><Plus className="h-4 w-4" />Aparelho</Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="loja-virtual">
        <TabsList>
          <TabsTrigger value="loja-virtual">Loja Virtual (tudo publicado)</TabsTrigger>
          <TabsTrigger value="aparelhos">Estoque de Aparelhos</TabsTrigger>
          <TabsTrigger value="produtos">Estoque Comercial</TabsTrigger>
        </TabsList>
        <TabsContent value="loja-virtual">
          <Card>
            <CardContent className="p-0">
              <LojaVirtualUnificadaTable />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="aparelhos">
          <Tabs defaultValue="fisica">
            <TabsList>
              <TabsTrigger value="fisica">Loja Física ({aparelhos.filter((a) => a.status !== "vendido" && !a.disponivel_loja_virtual && a.localizacao_estoque === "loja_fisica").length})</TabsTrigger>
              <TabsTrigger value="fornecedor">Fornecedor — fora da cidade ({aparelhos.filter((a) => a.status !== "vendido" && !a.disponivel_loja_virtual && a.localizacao_estoque === "fornecedor").length})</TabsTrigger>
              <TabsTrigger value="virtual">Publicados na Loja Virtual ({aparelhos.filter((a) => a.disponivel_loja_virtual).length})</TabsTrigger>
            </TabsList>
            <TabsContent value="fisica">
              <Card><CardContent className="p-0"><AparelhosTable aparelhos={aparelhos.filter((a) => a.status !== "vendido" && !a.disponivel_loja_virtual && a.localizacao_estoque === "loja_fisica")} cargo={cargo} /></CardContent></Card>
            </TabsContent>
            <TabsContent value="fornecedor">
              <p className="mb-3 text-xs text-muted-foreground">Aparelho com fornecedor fora da cidade — não dá pra entregar na hora, precisa de prazo de transferência.</p>
              <Card><CardContent className="p-0"><AparelhosTable aparelhos={aparelhos.filter((a) => a.status !== "vendido" && !a.disponivel_loja_virtual && a.localizacao_estoque === "fornecedor")} cargo={cargo} /></CardContent></Card>
            </TabsContent>
            <TabsContent value="virtual">
              <Card><CardContent className="p-0"><AparelhosTable aparelhos={aparelhos.filter((a) => a.disponivel_loja_virtual)} cargo={cargo} /></CardContent></Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
        <TabsContent value="produtos">
          <Card><CardContent className="p-0"><ProdutosTable produtos={produtos} saldos={saldos} cargo={cargo} /></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
