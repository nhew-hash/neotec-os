import type { LucideIcon } from "lucide-react";
import {
  Home,
  BarChart3,
  Users,
  KanbanSquare,
  MessageCircle,
  Package,
  Wrench,
  ShoppingCart,
  ShoppingBag,
  Wallet,
  FileSignature,
  CreditCard,
  Landmark,
  HandCoins,
  Tags,
  UserCheck,
  Rocket,
  Flame,
  UserCog,
  Camera,
  Store,
  Sparkles,
  Settings,
  Bot,
  Repeat,
  Smartphone,
  TrendingUp,
  BriefcaseBusiness,
  Images,
} from "lucide-react";
import type { CargoUsuario } from "@/types";

export interface SidebarNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Cargos que veem este item. O RLS já bloqueia o dado; isto evita mostrar atalho para uma tela que o cargo não usa. */
  cargos: CargoUsuario[];
  /** Descrição curta usada na busca de comandos (Ctrl+K). */
  descricao?: string;
}

export interface SidebarNavGroup {
  id: string;
  label: string;
  items: SidebarNavItem[];
}

const TODOS_OS_CARGOS: CargoUsuario[] = ["admin", "gerente", "vendedor", "tecnico", "caixa"];
const COMERCIAL: CargoUsuario[] = ["admin", "gerente", "vendedor"];
const GESTAO: CargoUsuario[] = ["admin", "gerente"];

/**
 * Núcleo do produto — Comunicação, CRM e Central Comercial, mais Início e
 * Clientes, que são o ponto de entrada dos três. Ficam sempre visíveis, no
 * topo, com peso visual maior que os grupos secundários.
 */
export const navPrincipal: SidebarNavItem[] = [
  { label: "Início", href: "/dashboard", icon: Home, cargos: TODOS_OS_CARGOS, descricao: "Pendências do dia e indicadores" },
  { label: "Comunicação", href: "/comunicacao", icon: MessageCircle, cargos: COMERCIAL, descricao: "Conversas do WhatsApp" },
  { label: "CRM", href: "/crm", icon: KanbanSquare, cargos: COMERCIAL, descricao: "Pipeline de oportunidades e follow-ups" },
  { label: "Central Comercial", href: "/central-comercial", icon: BriefcaseBusiness, cargos: COMERCIAL, descricao: "Minha rotina, propostas e gerência" },
  { label: "Clientes", href: "/clientes", icon: Users, cargos: TODOS_OS_CARGOS, descricao: "Cadastro e histórico do cliente" },
];

/**
 * Módulos secundários, agrupados por área de trabalho e recolhíveis. Decisões
 * da auditoria (docs/AUDITORIA_360.md, seção "Destino dos módulos"):
 * - NEO Performance: uma entrada só (o hub já linka Inteligência, Creative
 *   Factory, Automação etc.) — integração de anúncios ainda não é real.
 * - Cotações e Catálogo de fotos: mantidos (alimentam a IA de atendimento e o
 *   envio de fotos no chat), agrupados com Estoque/Catálogo.
 */
export const navSecundaria: SidebarNavGroup[] = [
  {
    id: "operacao",
    label: "Vendas e operação",
    items: [
      { label: "Vendas", href: "/vendas", icon: ShoppingCart, cargos: COMERCIAL, descricao: "Vendas, orçamentos e PDV" },
      { label: "Estoque", href: "/estoque", icon: Package, cargos: ["admin", "gerente", "vendedor", "tecnico"] },
      { label: "Assistência", href: "/assistencia", icon: Wrench, cargos: ["admin", "gerente", "tecnico"], descricao: "Ordens de serviço" },
      { label: "Trade-in", href: "/trade-in", icon: Repeat, cargos: COMERCIAL, descricao: "Avaliação de aparelho na troca" },
      { label: "Crediário", href: "/crediario", icon: CreditCard, cargos: COMERCIAL },
      { label: "Contratos", href: "/contratos", icon: FileSignature, cargos: COMERCIAL },
      { label: "Cotações", href: "/cotacoes", icon: Tags, cargos: COMERCIAL, descricao: "Preços de fornecedores" },
    ],
  },
  {
    id: "catalogo",
    label: "Catálogo e cadastro",
    items: [
      { label: "Central de Cadastro (IA)", href: "/estoque/central-fornecedor", icon: Sparkles, cargos: COMERCIAL },
      { label: "Importação automática", href: "/estoque/importacao-fornecedores", icon: Bot, cargos: GESTAO, descricao: "Listas de fornecedores via WhatsApp" },
      { label: "Banco de imagens", href: "/estoque/banco-imagens", icon: Images, cargos: COMERCIAL },
      { label: "Catálogo de fotos", href: "/catalogo-fotos", icon: Camera, cargos: COMERCIAL, descricao: "Fotos enviadas no chat e pela IA" },
    ],
  },
  {
    id: "loja",
    label: "Loja virtual",
    items: [
      { label: "Central da Loja", href: "/loja-admin", icon: Store, cargos: GESTAO },
      { label: "Pedidos da Loja", href: "/pedidos-loja", icon: ShoppingBag, cargos: COMERCIAL },
      { label: "Analytics da Loja", href: "/loja-admin/analytics", icon: BarChart3, cargos: GESTAO },
      { label: "Achadinhos", href: "/achadinhos-admin", icon: Flame, cargos: GESTAO },
    ],
  },
  {
    id: "gestao",
    label: "Gestão",
    items: [
      { label: "Financeiro", href: "/financeiro", icon: Wallet, cargos: GESTAO },
      { label: "Analytics", href: "/analytics", icon: BarChart3, cargos: GESTAO },
      { label: "Investidores", href: "/investidores", icon: Landmark, cargos: GESTAO },
      { label: "Consignação", href: "/consignacao", icon: HandCoins, cargos: GESTAO },
      { label: "Indicações", href: "/indicacoes", icon: UserCheck, cargos: GESTAO },
    ],
  },
  {
    id: "outros",
    label: "Outros módulos",
    items: [
      { label: "Prostec", href: "/prostec", icon: Rocket, cargos: ["admin", "gerente", "vendedor_prostec"], descricao: "Prospecção B2B" },
      { label: "NeoLoc", href: "/neoloc", icon: Smartphone, cargos: ["admin", "gerente", "vendedor", "tecnico"] },
      { label: "NEO Performance", href: "/neo-performance", icon: TrendingUp, cargos: GESTAO, descricao: "Anúncios, inteligência e creative factory" },
    ],
  },
  {
    id: "sistema",
    label: "Sistema",
    items: [
      { label: "Configurações", href: "/configuracoes", icon: Settings, cargos: ["admin"] },
      { label: "Equipe", href: "/configuracoes/equipe", icon: UserCog, cargos: ["admin"] },
    ],
  },
];

/** Compatibilidade: lista plana de grupos (principal + secundários). */
export const sidebarNavGroups: SidebarNavGroup[] = [{ id: "principal", label: "Principal", items: navPrincipal }, ...navSecundaria];

export function todosOsItens(): SidebarNavItem[] {
  return sidebarNavGroups.flatMap((g) => g.items);
}

export function itensDoCargo(cargo: CargoUsuario): SidebarNavItem[] {
  return todosOsItens().filter((i) => i.cargos.includes(cargo));
}

/**
 * Item ativo = o de href MAIS LONGO que casa com a rota. Antes, cada item
 * testava `startsWith` sozinho e em `/neo-performance/inteligencia` dois
 * itens ficavam destacados ao mesmo tempo (o mesmo com Estoque × Central de
 * Cadastro, Configurações × Equipe, Central da Loja × Analytics da Loja).
 */
export function hrefAtivo(pathname: string, itens: SidebarNavItem[] = todosOsItens()): string | null {
  let melhor: string | null = null;
  for (const item of itens) {
    const casa = pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (casa && (!melhor || item.href.length > melhor.length)) melhor = item.href;
  }
  return melhor;
}

/**
 * Barra inferior (celular): os pilares que o cargo usa, completados pelos
 * destinos mais frequentes do cargo — no máximo 5. Técnico, por exemplo,
 * vê Assistência e Estoque em vez de CRM.
 */
export function itensBarraInferior(cargo: CargoUsuario): SidebarNavItem[] {
  const ordem = ["/dashboard", "/comunicacao", "/crm", "/central-comercial", "/clientes", "/assistencia", "/vendas", "/estoque"];
  const visiveis = itensDoCargo(cargo);
  return ordem
    .map((href) => visiveis.find((i) => i.href === href))
    .filter((i): i is SidebarNavItem => Boolean(i))
    .slice(0, 5);
}

/** Rótulos curtos para a barra inferior (cabem em 1 linha). */
export const ROTULO_CURTO: Record<string, string> = {
  "/dashboard": "Início",
  "/comunicacao": "Conversas",
  "/crm": "CRM",
  "/central-comercial": "Comercial",
  "/clientes": "Clientes",
  "/assistencia": "OS",
  "/vendas": "Vendas",
  "/estoque": "Estoque",
};
