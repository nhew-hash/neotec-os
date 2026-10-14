import { createClient } from "@/lib/supabase/server";
import type { CargoUsuario } from "@/types";

/**
 * Checagem de cargo no SERVIDOR para Server Actions (auditoria S-02).
 * É defesa em profundidade: a RLS do banco continua sendo a barreira final.
 * Sempre confere a sessão com getUser() (valida o JWT) e lê o cargo da tabela
 * `usuarios`, nunca de um dado vindo do cliente.
 */
export type ResultadoCargo =
  | { permitido: true; userId: string; cargo: CargoUsuario }
  | { permitido: false; erro: string };

export function cargoPermitido(cargo: string | null | undefined, permitidos: readonly CargoUsuario[]): boolean {
  return !!cargo && (permitidos as readonly string[]).includes(cargo);
}

export async function exigirCargo(permitidos: readonly CargoUsuario[]): Promise<ResultadoCargo> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { permitido: false, erro: "Sessão expirada. Entre novamente." };
  const { data: perfil } = await supabase.from("usuarios").select("cargo").eq("id", user.id).maybeSingle();
  if (!cargoPermitido(perfil?.cargo, permitidos)) return { permitido: false, erro: "Você não tem permissão para esta ação." };
  return { permitido: true, userId: user.id, cargo: perfil!.cargo as CargoUsuario };
}
