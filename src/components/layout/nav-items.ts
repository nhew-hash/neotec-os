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
  Tags,
  Settings,
} from "lucide-react";
import type { CargoUsuario } from "@/types";

export interface SidebarNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Cargos que veem este item. Sem isso, o item apareceria pra todo
   * mundo mesmo em telas que o cargo não consegue realmente usar (o RLS
   * bloqueia o dado, mas o item ficava visível levando a uma tela vazia
   * — problema real que a reorganização resolve). */
  cargos: CargoUsuario[];
}

export interface SidebarNavGroup {
  label: string;
  items: SidebarNavItem[];
}

const TODOS_OS_CARGOS: CargoUsuario[] = ["admin", "gerente", "vendedor", "tecnico", "caixa"];

/**
 * Navegação agrupada por área de uso, e filtrada por cargo — cada grupo
 * reflete como a operação da loja realmente pensa o sistema, não a ordem
 * em que os módulos foram construídos.
 */
export const sidebarNavGroups: SidebarNavGroup[] = [
  {
    label: "Relacionamento",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, cargos: TODOS_OS_CARGOS },
      { label: "CRM", href: "/crm", icon: MessagesSquare, cargos: ["admin", "gerente", "vendedor"] },
      { label: "Comunicação", href: "/comunicacao", icon: MessageCircle, cargos: ["admin", "gerente", "vendedor"] },
      { label: "Clientes", href: "/clientes", icon: Users, cargos: TODOS_OS_CARGOS },
    ],
  },
  {
    label: "Operação",
    items: [
      { label: "Estoque", href: "/estoque", icon: Package, cargos: ["admin", "gerente", "vendedor", "tecnico"] },
      { label: "Cotações", href: "/cotacoes", icon: Tags, cargos: ["admin", "gerente", "vendedor"] },
      { label: "Vendas", href: "/vendas", icon: ShoppingCart, cargos: ["admin", "gerente", "vendedor"] },
      { label: "Assistência", href: "/assistencia", icon: Wrench, cargos: ["admin", "gerente", "tecnico"] },
    ],
  },
  {
    label: "Gestão",
    items: [
      { label: "Financeiro", href: "/financeiro", icon: Wallet, cargos: ["admin", "gerente"] },
      { label: "Investidores", href: "/investidores", icon: Landmark, cargos: ["admin", "gerente"] },
      { label: "Consignação", href: "/consignacao", icon: HandCoins, cargos: ["admin", "gerente"] },
      { label: "Analytics", href: "/analytics", icon: BarChart3, cargos: ["admin", "gerente"] },
    ],
  },
  {
    label: "Sistema",
    items: [
      { label: "Configurações", href: "/configuracoes", icon: Settings, cargos: ["admin"] },
    ],
  },
];

/** Subconjunto usado na barra inferior mobile — os destinos mais usados no dia a dia, já filtrados por cargo. */
export const bottomNavItems: SidebarNavItem[] = [
  { label: "Início", href: "/dashboard", icon: LayoutDashboard, cargos: TODOS_OS_CARGOS },
  { label: "CRM", href: "/crm", icon: MessagesSquare, cargos: ["admin", "gerente", "vendedor"] },
  { label: "Vendas", href: "/vendas", icon: ShoppingCart, cargos: ["admin", "gerente", "vendedor"] },
  { label: "Estoque", href: "/estoque", icon: Package, cargos: ["admin", "gerente", "vendedor", "tecnico"] },
  { label: "OS", href: "/assistencia", icon: Wrench, cargos: ["admin", "gerente", "tecnico"] },
];
