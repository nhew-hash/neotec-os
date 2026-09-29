import { createClient } from "@/lib/supabase/server";
import type { CargoUsuario } from "@/types";

/**
 * Fase 257 — permissão granular pra editar preço de venda pelo
 * Estoque. Regra de negócio explícita: admin/gerente sempre podem
 * (mesmo bracket de `podeVerCusto`); técnico NUNCA pode, mesmo que
 * alguém tente conceder a permissão (checagem sai antes de olhar a
 * tabela); vendedor (e qualquer outro cargo) só pode com a permissão
 * `editar_preco` explicitamente concedida em `estoque_permissoes_usuario`.
 *
 * Isso decide só a UI — a garantia real de segurança está na Server
 * Action (`atualizarPrecoVendaAction`), que reconfirma essa mesma regra
 * no servidor antes de qualquer escrita (nunca confia só nisso).
 */
export async function usuarioPodeEditarPreco(usuarioId: string, cargo: CargoUsuario): Promise<boolean> {
  if (cargo === "admin" || cargo === "gerente") return true;
  if (cargo === "tecnico") return false;

  const supabase = await createClient();
  const { data } = await supabase
    .from("estoque_permissoes_usuario")
    .select("permissao")
    .eq("usuario_id", usuarioId)
    .eq("permissao", "editar_preco")
    .maybeSingle();

  return !!data;
}

/** Pra tela de Equipe mostrar quem já tem a permissão marcada. */
export async function listarUsuariosComPermissaoEditarPreco(): Promise<Set<string>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("estoque_permissoes_usuario").select("usuario_id").eq("permissao", "editar_preco");
  if (error) return new Set(); // RLS bloqueia pra quem não é admin — silencioso, tela de Equipe já é admin-only
  return new Set((data ?? []).map((r) => r.usuario_id));
}
