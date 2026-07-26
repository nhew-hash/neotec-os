import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CentralLojaSidebar } from "@/components/loja-admin/central-loja-sidebar";
import type { CargoUsuario } from "@/types";

/**
 * Central da Loja — organiza tudo que já existia espalhado
 * (Estoque, Pedidos, Clientes, Configurações) mais o que faltava
 * (Marcas, Coleções, Cupons, Fretes, Avaliações, SEO) num menu só.
 * Itens marcados "↗" na sidebar apontam pra telas que já existiam
 * antes dessa central — não foram duplicadas nem movidas, só linkadas.
 */
export default async function LojaAdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: perfil } = await supabase
    .from("usuarios").select("cargo").eq("id", user?.id ?? "").single<{ cargo: CargoUsuario }>();

  if (!perfil || !["admin", "gerente"].includes(perfil.cargo)) redirect("/dashboard");

  return (
    <div className="flex min-h-[calc(100vh-4rem)] gap-6">
      <CentralLojaSidebar />
      <div className="flex-1 pb-8">{children}</div>
    </div>
  );
}
