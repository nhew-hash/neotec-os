"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Settings, Smartphone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials } from "@/utils";
import { CARGO_LABEL } from "@/utils/permissions";
import type { CargoUsuario } from "@/types";

interface UserMenuProps {
  nome: string;
  email: string;
  cargo: CargoUsuario;
}

export function UserMenu({ nome, email, cargo }: UserMenuProps) {
  const router = useRouter();

  async function handleSignOut() {
    // Aparelho deixa de receber avisos desta conta ao sair (celular compartilhado).
    try {
      const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration("/") : undefined;
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        const { removerInscricaoAction } = await import("@/services/celular/celular.actions");
        const r = await removerInscricaoAction(sub.endpoint);
        if (!r.success) console.error("Não foi possível desligar as notificações deste aparelho:", r.error);
        await sub.unsubscribe();
      }
    } catch (err) {
      console.error("Não foi possível desligar as notificações deste aparelho:", err);
    }
    const supabase = createClient();
    await supabase.auth.signOut();
    // Navega só no próximo frame, depois que o Radix termina de fechar o
    // menu (o `pointer-events: none` que ele aplica no <body> enquanto o
    // DropdownMenu está aberto precisa ser desfeito ANTES da navegação
    // desmontar o topbar/menu — se a navegação corta esse ciclo no meio,
    // em mobile isso pode deixar o <body> travado com pointer-events:
    // none pra sempre, mesmo depois de trocar de página).
    requestAnimationFrame(() => {
      router.push("/login");
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Avatar>
          <AvatarFallback>{getInitials(nome)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-foreground">{nome}</span>
          <span className="text-xs font-normal text-muted-foreground">{email}</span>
          <span className="mt-1 inline-flex w-fit rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            {CARGO_LABEL[cargo]}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {/* "Meu perfil" e "Configurações" ficavam sempre desabilitados (itens
            mortos). Configurações agora leva à tela real, só para quem tem acesso. */}
        {["admin", "gerente", "vendedor", "tecnico"].includes(cargo) && (
          <>
            <DropdownMenuItem asChild>
              <Link href="/celular"><Smartphone className="h-4 w-4" />App no celular</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {cargo === "admin" && (
          <>
            <DropdownMenuItem asChild>
              <Link href="/configuracoes"><Settings className="h-4 w-4" />Configurações</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
