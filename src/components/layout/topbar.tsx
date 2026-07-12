import { MobileNav } from "./mobile-nav";
import { UserMenu } from "./user-menu";
import type { CargoUsuario } from "@/types";

interface TopbarProps {
  usuario: {
    nome: string;
    email: string;
    cargo: CargoUsuario;
  };
  titulo?: string;
}

/**
 * Server Component — os dados do usuário chegam prontos via props
 * (buscados no layout do grupo (sistema)). Só o UserMenu e o MobileNav,
 * que precisam de interatividade, são Client Components.
 */
export function Topbar({ usuario, titulo }: TopbarProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 md:px-6">
      <div className="flex items-center gap-3">
        <MobileNav />
        {titulo && <h1 className="font-display text-base font-semibold text-foreground">{titulo}</h1>}
      </div>

      <UserMenu nome={usuario.nome} email={usuario.email} cargo={usuario.cargo} />
    </header>
  );
}
