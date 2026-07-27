import Link from "next/link";
import { Settings2 } from "lucide-react";
import { CentralFornecedorPanel } from "@/components/seminovos/central-fornecedor-panel";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";

export default function CentralFornecedorPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Central de Cadastro por Fornecedor"
        description="Cola a lista inteira do fornecedor — a IA separa seminovo, lacrado e qualquer outro produto, e manda cada um pro lugar certo"
        actions={
          <Button variant="outline" asChild>
            <Link href="/estoque/seminovos/regras-lucro"><Settings2 className="h-4 w-4" />Regras de lucro</Link>
          </Button>
        }
      />
      <CentralFornecedorPanel />
    </div>
  );
}
