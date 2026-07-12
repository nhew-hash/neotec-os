import type { CargoUsuario } from "@/types";

/**
 * Regras de visibilidade por cargo, centralizadas aqui para não haver
 * checagens de "cargo === 'admin'" espalhadas pelos componentes — sempre
 * que uma nova regra de papel for adicionada, é aqui que ela muda.
 *
 * IMPORTANTE: isso controla apenas o que a INTERFACE mostra. A garantia
 * real de segurança está no banco (RLS + views mascaradas), como decidido
 * desde a fase de banco de dados — estas funções nunca devem ser tratadas
 * como a única camada de proteção de dado sensível.
 */

export function podeVerCusto(cargo: CargoUsuario): boolean {
  return cargo === "admin" || cargo === "gerente";
}

export function podeVerFinanceiro(cargo: CargoUsuario): boolean {
  return cargo === "admin" || cargo === "gerente" || cargo === "caixa";
}

export function podeGerenciarUsuarios(cargo: CargoUsuario): boolean {
  return cargo === "admin";
}

export const CARGO_LABEL: Record<CargoUsuario, string> = {
  admin: "Administrador",
  gerente: "Gerente",
  vendedor: "Vendedor",
  tecnico: "Técnico",
  caixa: "Caixa",
};
