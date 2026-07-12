export * from "./database";

/** Formato padrão de retorno de uma Server Action neste projeto. */
export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

/** Item de navegação da sidebar/topbar. */
export interface NavItem {
  label: string;
  href: string;
  icon: string; // nome do ícone lucide-react, resolvido no componente
  badge?: number;
}
export * from "./database";

/** Formato padrão de retorno de uma Server Action neste projeto. */
export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };


/** Item de navegação da sidebar/topbar. */
export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
}