import { MobileNav } from "./mobile-nav";
import { UserMenu } from "./user-menu";
import { BuscaRapida } from "./busca-rapida";
import { getSaudacao } from "@/utils";
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
 * (buscados no layout do grupo (sistema)). Só o UserMenu, MobileNav e
 * BuscaRapida, que precisam de interatividade, são Client Components.
 */
export function Topbar({ usuario, titulo }: TopbarProps) {
  const primeiroNome = usuario.nome.split(" ")[0];

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b border-border bg-card px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <MobileNav cargo={usuario.cargo} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {titulo ?? `${getSaudacao()}, ${primeiroNome}`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <BuscaRapida />
        <UserMenu nome={usuario.nome} email={usuario.email} cargo={usuario.cargo} />
      </div>
    </header>
  );
}
