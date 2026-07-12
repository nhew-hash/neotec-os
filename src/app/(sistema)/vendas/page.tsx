import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listarOrcamentos, listarVendas } from "@/services/vendas/vendas.service";
import { OrcamentosTable } from "@/components/vendas/orcamentos-table";
import { VendasTable } from "@/components/vendas/vendas-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CargoUsuario } from "@/types";

export default async function VendasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: perfil } = await supabase
    .from("usuarios").select("cargo").eq("id", user?.id ?? "").single<{ cargo: CargoUsuario }>();
  const cargo = perfil?.cargo ?? "vendedor";

  const [orcamentos, vendas] = await Promise.all([listarOrcamentos(), listarVendas()]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">Vendas</h1>
          <p className="text-sm text-muted-foreground">{vendas.length} venda(s) · {orcamentos.length} orçamento(s)</p>
        </div>
        <Button asChild>
          <Link href="/vendas/orcamentos/novo"><Plus className="h-4 w-4" />Novo orçamento</Link>
        </Button>
      </div>

      <Tabs defaultValue="orcamentos">
        <TabsList>
          <TabsTrigger value="orcamentos">Orçamentos</TabsTrigger>
          <TabsTrigger value="vendas">Vendas</TabsTrigger>
        </TabsList>
        <TabsContent value="orcamentos">
          <Card><CardContent className="p-0"><OrcamentosTable orcamentos={orcamentos} /></CardContent></Card>
        </TabsContent>
        <TabsContent value="vendas">
          <Card><CardContent className="p-0"><VendasTable vendas={vendas} cargo={cargo} /></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
