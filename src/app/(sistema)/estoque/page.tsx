import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listarProdutos, listarAparelhos } from "@/services/estoque/estoque.service";
import { ProdutosTable } from "@/components/estoque/produtos-table";
import { AparelhosTable } from "@/components/estoque/aparelhos-table";
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
  const [produtos, aparelhos] = await Promise.all([listarProdutos(), listarAparelhos()]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">Estoque</h1>
          <p className="text-sm text-muted-foreground">
            {aparelhos.length} aparelho(s) · {produtos.length} produto(s) no catálogo
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/estoque/produtos/novo"><Plus className="h-4 w-4" />Produto</Link>
          </Button>
          <Button asChild>
            <Link href="/estoque/aparelhos/novo"><Plus className="h-4 w-4" />Aparelho</Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="aparelhos">
        <TabsList>
          <TabsTrigger value="aparelhos">Estoque de Aparelhos</TabsTrigger>
          <TabsTrigger value="produtos">Estoque Comercial</TabsTrigger>
        </TabsList>
        <TabsContent value="aparelhos">
          <Card><CardContent className="p-0"><AparelhosTable aparelhos={aparelhos} cargo={cargo} /></CardContent></Card>
        </TabsContent>
        <TabsContent value="produtos">
          <Card><CardContent className="p-0"><ProdutosTable produtos={produtos} cargo={cargo} /></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
