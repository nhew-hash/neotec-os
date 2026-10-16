import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { Sidebar, COOKIE_SIDEBAR } from "@/components/layout/sidebar";
import { ShellTema } from "@/components/layout/shell-tema";
import { Topbar } from "@/components/layout/topbar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { RadixOverlaySafetyNet } from "@/components/layout/radix-overlay-safety-net";
import { contarConversasNaoLidas } from "@/services/whatsapp/whatsapp.service";
import { RegistrarApp } from "@/components/celular/registrar-app";
import { OcultarEmTelaCheia } from "@/components/layout/ocultar-em-tela-cheia";
import { METADATA_APP, VIEWPORT_APP } from "@/lib/pwa/metadata";
import { AvisoAppCelular } from "@/components/celular/aviso-app-celular";
import type { ReactNode } from "react";
import type { CargoUsuario } from "@/types";

// App instalável no celular (PWA): só o sistema, não a loja pública.
export const metadata = METADATA_APP;
export const viewport = VIEWPORT_APP;

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

  const [naoLidasInicial, cookieStore] = await Promise.all([contarConversasNaoLidas(), cookies()]);
  const sidebarRecolhida = cookieStore.get(COOKIE_SIDEBAR)?.value === "recolhida";

  return (
    <div className="neotec-os flex h-dvh overflow-hidden bg-app text-foreground">
      <ShellTema />
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:shadow-popover">
        Pular para o conteúdo
      </a>
      <Sidebar cargo={perfil.cargo} naoLidasInicial={naoLidasInicial} recolhidaInicial={sidebarRecolhida} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <OcultarEmTelaCheia><Topbar usuario={perfil} naoLidasInicial={naoLidasInicial} /></OcultarEmTelaCheia>
        <main id="conteudo" className="flex-1 overflow-y-auto p-4 pb-24 md:p-8 md:pb-10"><AvisoAppCelular />{children}</main>
      </div>
      <OcultarEmTelaCheia><BottomNav cargo={perfil.cargo} naoLidasInicial={naoLidasInicial} /></OcultarEmTelaCheia>
      <RadixOverlaySafetyNet />
      <RegistrarApp />
    </div>
  );
}
