import Link from "next/link";
import { Plus } from "lucide-react";
import { listarClientes } from "@/services/clientes/clientes.service";
import { ClientesTable } from "@/components/clientes/clientes-table";
import { ClientesSearchBar } from "@/components/clientes/clientes-search-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { paginar } from "@/utils/paginar";
import type { Cliente } from "@/types";

const POR_PAGINA = 20;

interface ClientesPageProps {
  searchParams: Promise<{ busca?: string; nivel?: string; origem?: string; pagina?: string }>;
}

export default async function ClientesPage({ searchParams }: ClientesPageProps) {
  const { busca, nivel, origem, pagina } = await searchParams;

  const clientes = await listarClientes({
    busca,
    nivel: nivel as Cliente["nivel"] | undefined,
    origem: origem as Cliente["origem"] | undefined,
  });

  const paginaAtual = Number(pagina ?? "1");
  const clientesPaginados = paginar(clientes, paginaAtual, POR_PAGINA);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Clientes"
        description={`${clientes.length} cliente(s) encontrado(s)`}
        actions={
          <Button asChild>
            <Link href="/clientes/novo"><Plus className="h-4 w-4" />Novo cliente</Link>
          </Button>
        }
      />

      <ClientesSearchBar />

      <Card>
        <CardContent className="p-0">
          <ClientesTable clientes={clientesPaginados} />
          <Pagination totalItens={clientes.length} itensPorPagina={POR_PAGINA} />
        </CardContent>
      </Card>
    </div>
  );
}
