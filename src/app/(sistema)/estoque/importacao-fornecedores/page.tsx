import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listarFontesAction, listarExecucoesRecentesAction } from "@/services/importacao-fornecedores/fontes.actions";
import {
  listarCategoriasFolhaAction,
  listarMargensCategoriaAction,
  listarRegrasLucroParaSelecaoAction,
} from "@/services/importacao-fornecedores/margem.actions";
import { ImportacaoFornecedoresPanel } from "@/components/estoque/importacao-fornecedores-panel";
import { MargemCategoriaPanel } from "@/components/estoque/margem-categoria-panel";
import { PageHeader } from "@/components/ui/page-header";
import type { CargoUsuario } from "@/types";

export default async function ImportacaoFornecedoresPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: perfil } = await supabase
    .from("usuarios").select("cargo").eq("id", user?.id ?? "").single<{ cargo: CargoUsuario }>();

  if (!perfil || !["admin", "gerente"].includes(perfil.cargo)) redirect("/estoque");

  const [fontesResultado, execucoesResultado, categoriasResultado, margensResultado, regrasResultado] = await Promise.all([
    listarFontesAction(),
    listarExecucoesRecentesAction(20),
    listarCategoriasFolhaAction(),
    listarMargensCategoriaAction(),
    listarRegrasLucroParaSelecaoAction(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Importação automática de fornecedores"
        description="Cadastro automático de estoque a partir das listas do Goat e da Realeza, coladas nas comunidades do WhatsApp — mesmo número usado no CRM."
      />
      <ImportacaoFornecedoresPanel
        fontesIniciais={fontesResultado.success ? fontesResultado.data.fontes : []}
        execucoesIniciais={execucoesResultado.success ? execucoesResultado.data.execucoes : []}
      />
      <MargemCategoriaPanel
        categorias={categoriasResultado.success ? categoriasResultado.data.categorias : []}
        margensIniciais={margensResultado.success ? margensResultado.data.margens : []}
        regras={regrasResultado.success ? regrasResultado.data.regras : []}
      />
    </div>
  );
}
