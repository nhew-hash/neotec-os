import Link from "next/link";
import { Users, User, Search, ShoppingBag } from "lucide-react";

const OPCOES = [
  { href: "/login/equipe", label: "Área da Equipe", desc: "Login com e-mail e senha", icon: Users, destaque: true },
  { href: "/portal/login", label: "Portal do Cliente", desc: "Suas compras, garantias e cashback", icon: User },
  { href: "/consultar-os", label: "Consultar Ordem", desc: "Sem login — número da OS ou telefone", icon: Search },
  { href: "/loja", label: "Loja Virtual", desc: "Em breve", icon: ShoppingBag },
];

export default function LoginHubPage() {
  return (
    <div className="neotec-grid-pattern flex min-h-screen items-center justify-center bg-sidebar p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary font-display text-lg font-bold text-white">
            N
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold text-white">Neotec OS</h1>
            <p className="text-sm text-sidebar-muted">Como você quer entrar?</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {OPCOES.map((opcao) => (
            <Link
              key={opcao.href}
              href={opcao.href}
              className={
                opcao.destaque
                  ? "flex items-center gap-4 rounded-card border border-primary bg-primary p-4 text-primary-foreground shadow-card"
                  : "flex items-center gap-4 rounded-card border border-sidebar-border bg-sidebar-hover p-4 text-white shadow-card transition-colors hover:bg-sidebar-active"
              }
            >
              <opcao.icon className="h-5 w-5 shrink-0" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">{opcao.label}</span>
                <span className={opcao.destaque ? "text-xs text-primary-foreground/80" : "text-xs text-sidebar-muted"}>
                  {opcao.desc}
                </span>
              </div>
            </Link>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-sidebar-muted">Neotec Araguari</p>
      </div>
    </div>
  );
}
