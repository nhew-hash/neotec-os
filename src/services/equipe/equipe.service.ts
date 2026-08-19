import { createClient } from "@/lib/supabase/server";

export interface MembroEquipe {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  created_at: string;
}

export async function listarEquipe(): Promise<MembroEquipe[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("usuarios").select("id, nome, email, cargo, created_at").order("created_at", { ascending: false });
  if (error) throw new Error(`Não foi possível carregar a equipe: ${error.message}`);
  return data ?? [];
}
