import { createClient } from "@/lib/supabase/server";
import { listarUsuariosComPermissaoEditarPreco } from "@/services/estoque/estoque-permissoes.service";

export interface MembroEquipe {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  /** Fase 257 — só relevante pra cargo "vendedor" (admin/gerente sempre podem, técnico nunca pode, independente disso). */
  podeEditarPreco: boolean;
}

export async function listarEquipe(): Promise<MembroEquipe[]> {
  const supabase = await createClient();
  const [{ data, error }, permissoesEditarPreco] = await Promise.all([
    supabase.from("usuarios").select("id, nome, email, cargo"),
    listarUsuariosComPermissaoEditarPreco(),
  ]);
  if (error) throw new Error(`Não foi possível carregar a equipe: ${error.message}`);
  return (data ?? [])
    .map((m) => ({ ...m, podeEditarPreco: permissoesEditarPreco.has(m.id) }))
    .sort((a, b) => a.nome.localeCompare(b.nome));
}
