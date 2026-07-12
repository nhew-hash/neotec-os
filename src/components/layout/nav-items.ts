import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  BarChart3,
  Users,
  MessagesSquare,
  MessageCircle,
  Package,
  Wrench,
  ShoppingCart,
  Wallet,
  Landmark,
  HandCoins,
  Settings,
} from "lucide-react";

export interface SidebarNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

/**
 * Fonte única dos itens de navegação — usada tanto pela sidebar desktop
 * quanto pelo menu mobile, para não duplicar a lista em dois lugares.
 */
export const sidebarNavItems: SidebarNavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "CRM", href: "/crm", icon: MessagesSquare },
  { label: "Comunicação", href: "/comunicacao", icon: MessageCircle },
  { label: "Clientes", href: "/clientes", icon: Users },
  { label: "Estoque", href: "/estoque", icon: Package },
  { label: "Assistência", href: "/assistencia", icon: Wrench },
  { label: "Vendas", href: "/vendas", icon: ShoppingCart },
  { label: "Consignação", href: "/consignacao", icon: HandCoins },
  { label: "Investidores", href: "/investidores", icon: Landmark },
  { label: "Financeiro", href: "/financeiro", icon: Wallet },
  { label: "Configurações", href: "/configuracoes", icon: Settings },
];

/** Subconjunto usado na barra inferior mobile — os 5 destinos mais usados no dia a dia. */
export const bottomNavItems: SidebarNavItem[] = [
  { label: "Início", href: "/dashboard", icon: LayoutDashboard },
  { label: "CRM", href: "/crm", icon: MessagesSquare },
  { label: "Vendas", href: "/vendas", icon: ShoppingCart },
  { label: "Estoque", href: "/estoque", icon: Package },
  { label: "OS", href: "/assistencia", icon: Wrench },
];
