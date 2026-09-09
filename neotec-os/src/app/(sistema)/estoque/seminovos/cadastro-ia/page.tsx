import Link from "next/link";
import { Settings2 } from "lucide-react";
import { CadastroIaSeminovoPanel } from "@/components/seminovos/cadastro-ia-seminovo-panel";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";

export default function CadastroIaSeminovoPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Cadastro de Seminovo por IA"
        description="Cola os dados do aparelho, a IA identifica tudo e já calcula o preço de venda"
        actions={
          <Button variant="outline" asChild>
            <Link href="/estoque/seminovos/regras-lucro"><Settings2 className="h-4 w-4" />Regras de lucro</Link>
          </Button>
        }
      />
      <CadastroIaSeminovoPanel />
    </div>
  );
}
