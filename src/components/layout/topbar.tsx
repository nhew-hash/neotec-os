import { MobileNav } from "./mobile-nav";
import { UserMenu } from "./user-menu";
import { BuscaComandos } from "./busca-comandos";
import { TituloSecao } from "./titulo-secao";
import { getSaudacao } from "@/utils";
import type { CargoUsuario } from "@/types";

interface TopbarProps {
  usuario: {
    nome: string;
    email: string;
    cargo: CargoUsuario;
  };
  naoLidasInicial: number;
}

/**
 * Server Component — os dados do usuário chegam prontos via props
 * (buscados no layout do grupo (sistema)). Só as partes interativas são
 * Client Components.
 */
export function Topbar({ usuario, naoLidasInicial }: TopbarProps) {
  const primeiroNome = usuario.nome.split(" ")[0];

  return (
    <header className="flex h-[calc(3.5rem+env(safe-area-inset-top))] shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 pt-[env(safe-area-inset-top)] md:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <MobileNav cargo={usuario.cargo} naoLidasInicial={naoLidasInicial} />
        <TituloSecao saudacao={`${getSaudacao()}, ${primeiroNome}`} />
      </div>

      <div className="flex items-center gap-2">
        <BuscaComandos cargo={usuario.cargo} />
        <UserMenu nome={usuario.nome} email={usuario.email} cargo={usuario.cargo} />
      </div>
    </header>
  );
}
