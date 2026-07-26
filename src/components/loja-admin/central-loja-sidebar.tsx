"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Package, Smartphone, Sparkles, Layers, Tag, Bookmark, Percent,
  Ticket, Image, Star, ShoppingBag, Users, Boxes, Wallet, Truck, Search, Plug, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ItemMenuLoja {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  externo?: boolean; // aponta pra uma tela que já existe fora do /loja-admin — não duplicada aqui
}

const MENU_LOJA: ItemMenuLoja[] = [
  { label: "Dashboard", href: "/loja-admin", icon: LayoutDashboard },
  { label: "Produtos", href: "/estoque", icon: Package, externo: true },
  { label: "iPhones Seminovos", href: "/estoque/seminovos/cadastro-ia", icon: Smartphone, externo: true },
  { label: "iPhones Lacrados", href: "/estoque/lacrados", icon: Sparkles, externo: true },
  { label: "Categorias", href: "/estoque", icon: Layers, externo: true },
  { label: "Marcas", href: "/loja-admin/marcas", icon: Tag },
  { label: "Coleções", href: "/loja-admin/colecoes", icon: Bookmark },
  { label: "Promoções", href: "/estoque", icon: Percent, externo: true },
  { label: "Cupons", href: "/loja-admin/cupons", icon: Ticket },
  { label: "Banners", href: "/configuracoes/loja-cms", icon: Image, externo: true },
  { label: "Avaliações", href: "/loja-admin/avaliacoes", icon: Star },
  { label: "Pedidos", href: "/pedidos-loja", icon: ShoppingBag, externo: true },
  { label: "Clientes", href: "/clientes", icon: Users, externo: true },
  { label: "Estoque", href: "/estoque", icon: Boxes, externo: true },
  { label: "Financeiro da Loja", href: "/financeiro", icon: Wallet, externo: true },
  { label: "Fretes", href: "/loja-admin/fretes", icon: Truck },
  { label: "SEO", href: "/loja-admin/seo", icon: Search },
  { label: "Integrações", href: "/configuracoes", icon: Plug, externo: true },
  { label: "Configurações", href: "/configuracoes/marketing", icon: Settings, externo: true },
];

export function CentralLojaSidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex w-60 shrink-0 flex-col gap-0.5 border-r border-border p-3">
      <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Central da Loja</p>
      {MENU_LOJA.map((item) => {
        const ativo = pathname === item.href;
        return (
          <Link
            key={item.href + item.label}
            href={item.href}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
              ativo ? "bg-primary/10 font-medium text-primary" : "text-foreground/80 hover:bg-secondary"
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.externo && <span className="text-[10px] text-muted-foreground">↗</span>}
          </Link>
        );
      })}
    </nav>
  );
}
