import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { contarConversasNaoLidas } from "@/services/whatsapp/whatsapp.service";
import type { ReactNode } from "react";
import type { CargoUsuario } from "@/types";

/**
 * Todas as rotas dentro de (sistema) exigem usuário autenticado E com
 * perfil na tabela `usuarios` (o middleware já garante a sessão; aqui
 * garantimos que o perfil de negócio existe antes de renderizar o shell).
 */
export default async function SistemaLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("nome, email, cargo")
    .eq("id", user.id)
    .single<{ nome: string; email: string; cargo: CargoUsuario }>();

  // Sessão válida no Supabase Auth, mas sem perfil de negócio correspondente
  // ainda cadastrado em `usuarios` — situação de configuração incompleta,
  // não deve renderizar o sistema com dados vazios.
  if (!perfil) {
    redirect("/login?erro=perfil_nao_encontrado");
  }

  const naoLidasInicial = await contarConversasNaoLidas();

  return (
    <div className="flex h-screen overflow-hidden bg-app">
      <Sidebar cargo={perfil.cargo} naoLidasInicial={naoLidasInicial} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar usuario={perfil} naoLidasInicial={naoLidasInicial} />
        <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-8 md:pb-8">{children}</main>
      </div>
      <BottomNav cargo={perfil.cargo} />
    </div>
  );
}
