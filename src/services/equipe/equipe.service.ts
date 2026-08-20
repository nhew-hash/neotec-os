import { createClient } from "@/lib/supabase/server";

export interface MembroEquipe {
  id: string;
  nome: string;
  email: string;
  cargo: string;
}

export async function listarEquipe(): Promise<MembroEquipe[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("usuarios").select("id, nome, email, cargo");
  if (error) throw new Error(`Não foi possível carregar a equipe: ${error.message}`);
  return (data ?? []).sort((a, b) => a.nome.localeCompare(b.nome));
}
