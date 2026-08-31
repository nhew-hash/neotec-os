"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Tag, Bookmark, Ticket, Star, Truck, Search, BarChart3,
  Package, Smartphone, ShoppingBag, Users, Wallet, Image, Plug, ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ItemMenuLoja {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
}

// Só páginas que REALMENTE vivem dentro de /loja-admin — clicar aqui
// nunca tira o usuário da Central da Loja, o menu continua visível.
const MENU_INTERNO: ItemMenuLoja[] = [
  { label: "Dashboard", href: "/loja-admin", icon: LayoutDashboard },
  { label: "Analytics da Loja", href: "/loja-admin/analytics", icon: BarChart3 },
  { label: "Marcas", href: "/loja-admin/marcas", icon: Tag },
  { label: "Coleções", href: "/loja-admin/colecoes", icon: Bookmark },
  { label: "Cupons", href: "/loja-admin/cupons", icon: Ticket },
  { label: "Avaliações", href: "/loja-admin/avaliacoes", icon: Star },
  { label: "Fretes", href: "/loja-admin/fretes", icon: Truck },
  { label: "SEO", href: "/loja-admin/seo", icon: Search },
];

// Ferramentas relacionadas, mas que moram em outra área do sistema —
// separadas visualmente de propósito, pra nunca dar a impressão de
// "sumiu" quando o usuário clica.
const MENU_RELACIONADO: ItemMenuLoja[] = [
  { label: "Produtos e estoque", href: "/estoque", icon: Package },
  { label: "iPhones (Central de Cadastro)", href: "/estoque/central-fornecedor", icon: Smartphone },
  { label: "Pedidos", href: "/pedidos-loja", icon: ShoppingBag },
  { label: "Clientes", href: "/clientes", icon: Users },
  { label: "Financeiro da loja", href: "/financeiro", icon: Wallet },
  { label: "Banners (Home CMS)", href: "/configuracoes/loja-cms", icon: Image },
  { label: "Integrações", href: "/configuracoes", icon: Plug },
];

export function CentralLojaSidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex w-64 shrink-0 flex-col gap-4 border-r border-border p-3">
      <div className="flex flex-col gap-0.5">
        <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Central da Loja</p>
        {MENU_INTERNO.map((item) => {
          const ativo = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                ativo ? "bg-primary/10 font-medium text-primary" : "text-foreground/80 hover:bg-secondary"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="flex flex-col gap-0.5 border-t border-border pt-3">
        <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ferramentas relacionadas</p>
        <p className="mb-1.5 px-2 text-[11px] leading-snug text-muted-foreground">Essas telas ficam em outra área do sistema — ao clicar, você sai da Central da Loja.</p>
        {MENU_RELACIONADO.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{item.label}</span>
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
          </Link>
        ))}
      </div>
    </nav>
  );
}
